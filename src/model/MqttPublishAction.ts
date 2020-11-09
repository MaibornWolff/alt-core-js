import * as hexdump from 'hexdump-nodejs';
import { connect } from 'mqtt';
import { DiagramConfiguration } from '../diagramDrawing/diagramDrawing';
import { addMqttPublishMessage } from '../diagramDrawing/mqtt';
import { getLogger, LoggingContext } from '../logging';
import { encodeProto, encodeProtoWithEncoding } from '../protoParsing';
import {
    injectEvalAndVarsToMap,
    injectEvalAndVarsToString,
} from '../variableInjection';
import { Action } from './Action';
import { ActionCallback } from './ActionCallback';
import { ActionType } from './ActionType';
import { Scenario } from './Scenario';

class MqttPublishAction implements Action {
    public name: string;

    public description: string;

    public type = ActionType.MQTT_PUBLISH;

    private url: string;

    private username: string;

    private password: string;

    private topic: string;

    private data: any;

    private protoFile: string;

    private protoClass: string;

    private protoEncoding: string;

    public invokeEvenOnFail = false;

    public allowFailure = false;

    private readonly diagramConfiguration: DiagramConfiguration;

    private readonly variableAsPayload?: string;

    public constructor(
        name: string,
        desc = name,
        actionDef: any,
        url = actionDef.url,
        username = actionDef.username,
        password = actionDef.password,
        topic = actionDef.topic,
        data = actionDef.data,
        protoFile = actionDef.protoFile,
        protoClass = actionDef.protoClass,
        protoEncoding = actionDef.protoEncoding,
        invokeEvenOnFail = actionDef.invokeEvenOnFail,
        allowFailure = actionDef.allowFailure,
        diagramConfiguration = actionDef.diagramConfiguration ?? {},
        variableAsPayload = actionDef.variableAsPayload,
    ) {
        this.name = name;
        this.url = url;
        this.username = username;
        this.password = password;
        this.topic = topic;
        this.data = data;
        this.protoFile = protoFile;
        this.protoClass = protoClass;
        this.protoEncoding = protoEncoding;
        this.description = desc;
        this.invokeEvenOnFail = invokeEvenOnFail;
        this.allowFailure = allowFailure;
        this.diagramConfiguration = diagramConfiguration;
        this.variableAsPayload = variableAsPayload;
    }

    public static fromTemplate(
        mqttPublishDefinition: any,
        template: MqttPublishAction,
    ): MqttPublishAction {
        console.log(
            new MqttPublishAction(
                template.name,
                mqttPublishDefinition.description || mqttPublishDefinition.name,
                { ...template, ...mqttPublishDefinition },
            ),
        );
        return new MqttPublishAction(
            template.name,
            mqttPublishDefinition.description || mqttPublishDefinition.name,
            { ...template, ...mqttPublishDefinition },
        );
    }

    public invoke(scenario: Scenario): ActionCallback {
        const promise = new Promise((resolve, reject) => {
            this.invokeAsync(scenario, reject);
            resolve();
        });
        return { promise, cancel: () => console.log('TODO') };
    }

    public encodeProtoPayload(
        scenarioVariables: Map<string, any>,
        ctx = {},
    ): [Buffer | string, string] {
        const data = injectEvalAndVarsToMap(this.data, scenarioVariables, ctx);
        return [
            this.protoEncoding
                ? encodeProtoWithEncoding(
                      this.protoFile,
                      data,
                      this.protoClass,
                      this.protoEncoding,
                  )
                : encodeProto(this.protoFile, data, this.protoClass),
            JSON.stringify(data),
        ];
    }

    private genrateJsonPayload(
        scenarioVariables: Map<string, any>,
        ctx = {},
    ): [string, string] {
        const payload = JSON.stringify(
            injectEvalAndVarsToMap(this.data, scenarioVariables, ctx),
        );
        return [payload, payload];
    }

    private invokeAsync(scenario: Scenario, reject): void {
        const logDebug = (debugMessage: string): void => {
            getLogger(scenario.name).debug(debugMessage, ctx);
        };

        const logError = (errorMessage: string): void => {
            getLogger(scenario.name).error(errorMessage, ctx);
        };

        let ctx = { scenario: scenario.name, action: this.topic };

        const { url, username, password } = this.expandParameters(
            scenario.cache,
            ctx,
        );

        // https://www.npmjs.com/package/mqtt#client
        const client = connect(url, {
            username,
            password,
            keepalive: 60,
            clientId:
                this.name +
                Math.random()
                    .toString(16)
                    .substr(2, 8),
            clean: true,
            reconnectPeriod: 1000,
            connectTimeout: 30000,
            resubscribe: true,
        });

        client.on('connect', () => {
            logDebug(`MQTT connection to ${this.url} successfully opened`);

            let [payload, dataString]: [string | Buffer, string] = ['', ''];

            if (this.variableAsPayload !== undefined) {
                console.log('variableAsPayload: ', this.variableAsPayload);
                if (typeof this.variableAsPayload !== 'string') {
                    reject(new Error('variableAsPayload needs to be a string'));
                } else {
                    [payload, dataString] = [
                        this.variableAsPayload,
                        this.variableAsPayload,
                    ];
                }
            } else {
                [payload, dataString] = this.protoFile
                    ? this.encodeProtoPayload(scenario.cache, ctx)
                    : this.genrateJsonPayload(scenario.cache, ctx);
            }

            const topic = injectEvalAndVarsToString(
                this.topic,
                scenario.cache,
                ctx,
            ).toString();

            client.publish(topic, payload, (error?: any) => {
                if (error) {
                    logError(`Error while publishing to ${topic}: ${error}`);
                } else {
                    logDebug(
                        `Successfully published message to '${topic}': ${dataString}`,
                    );

                    if (this.protoFile) {
                        // log the hex dump of the sent proto payload
                        logDebug('-- Encoded proto data --');
                        logDebug(
                            `Base64: ${Buffer.from(
                                payload as Uint8Array,
                            ).toString('base64')}`,
                        );
                        logDebug('Hex:');
                        logDebug(hexdump(payload));
                    }

                    addMqttPublishMessage(
                        scenario.name,
                        topic,
                        `{"payload":${dataString}}`,
                        this.diagramConfiguration,
                    );
                    client.end();
                }
            });
        });

        // client.on('close', () => {
        //     getLogger(scenario.name).debug(`MQTT connection closed!`, ctx);
        // });

        client.on('error', (error: any) => {
            getLogger(scenario.name).error(
                `Error during connection: ${error}`,
                ctx,
            );
        });
    }

    private expandParameters(
        scenarioVariables: Map<string, unknown>,
        ctx: LoggingContext,
    ): {
        url: string;
        username: string;
        password: string;
    } {
        const url = injectEvalAndVarsToString(
            this.url,
            scenarioVariables,
            ctx,
        ).toString();
        const username = injectEvalAndVarsToString(
            this.username,
            scenarioVariables,
            ctx,
        ).toString();
        const password = injectEvalAndVarsToString(
            this.password,
            scenarioVariables,
            ctx,
        ).toString();

        return { url, username, password };
    }
}

export { MqttPublishAction };
