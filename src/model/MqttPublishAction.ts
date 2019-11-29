import * as hexdump from 'hexdump-nodejs';
import { connect } from 'mqtt';
import { addMqttPublishMessage, DiagramConfiguration } from '../diagramDrawing';
import { getLogger } from '../logging';
import { encodeProto } from '../protoParsing';
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

    public invokeEvenOnFail = false;

    public allowFailure = false;

    private readonly diagramConfiguration: DiagramConfiguration;

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
        invokeEvenOnFail = actionDef.invokeEvenOnFail,
        allowFailure = actionDef.allowFailure,
        diagramConfiguration = actionDef.diagramConfiguration ?? {},
    ) {
        this.name = name;
        this.url = url;
        this.username = username;
        this.password = password;
        this.topic = topic;
        this.data = data;
        this.protoFile = protoFile;
        this.protoClass = protoClass;
        this.description = desc;
        this.invokeEvenOnFail = invokeEvenOnFail;
        this.allowFailure = allowFailure;
        this.diagramConfiguration = diagramConfiguration;
    }

    public static fromTemplate(
        mqttPublishDefinition: any,
        template: MqttPublishAction,
    ): MqttPublishAction {
        return new MqttPublishAction(
            template.name,
            mqttPublishDefinition.description || mqttPublishDefinition.name,
            { ...template, ...mqttPublishDefinition },
        );
    }

    public invoke(scenario: Scenario): ActionCallback {
        const promise = new Promise(resolve => {
            this.invokeAsync(scenario);
            resolve();
        });
        return { promise, cancel: () => console.log('TODO') };
    }

    public encodeProtoPayload(
        scenarioVariables: Map<string, any>,
        ctx = {},
    ): [Buffer, string] {
        const data = injectEvalAndVarsToMap(this.data, scenarioVariables, ctx);
        return [
            encodeProto(this.protoFile, data, this.protoClass),
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

    private invokeAsync(scenario: Scenario): void {
        const logDebug = (debugMessage: string): void => {
            getLogger(scenario.name).debug(debugMessage, ctx);
        };

        const logError = (errorMessage: string): void => {
            getLogger(scenario.name).error(errorMessage, ctx);
        };

        let ctx = { scenario: scenario.name, action: this.topic };

        // https://www.npmjs.com/package/mqtt#client
        const client = connect(this.url, {
            username: this.username,
            password: this.password,
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

            const [payload, dataString] = this.protoFile
                ? this.encodeProtoPayload(scenario.cache, ctx)
                : this.genrateJsonPayload(scenario.cache, ctx);

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
}

export { MqttPublishAction };
