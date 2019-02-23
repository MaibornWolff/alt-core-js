import * as hexdump from 'hexdump-nodejs';
import { connect } from 'mqtt';
import { addMqttPublishMessage } from '../diagramDrawing';
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
    name: string;

    type = ActionType.MQTT_PUBLISH;

    url: string;

    username: string;

    password: string;

    topic: string;

    data: any;

    protoFile: string;

    protoClass: string;

    constructor(
        name: string,
        mqttDefinition: any,
        url = mqttDefinition.url,
        username = mqttDefinition.username,
        password = mqttDefinition.password,
        topic = mqttDefinition.topic,
        data = mqttDefinition.data,
        protoFile = mqttDefinition.protoFile,
        protoClass = mqttDefinition.protoClass,
    ) {
        this.name = name;
        this.url = url;
        this.username = username;
        this.password = password;
        this.topic = topic;
        this.data = data;
        this.protoFile = protoFile;
        this.protoClass = protoClass;
    }

    static fromTemplate(
        mqttDefinition: any,
        template: MqttPublishAction,
    ): MqttPublishAction {
        return new MqttPublishAction(
            template.name,
            Object.assign(Object.assign({}, template), mqttDefinition),
        );
    }

    invoke(scenario: Scenario): ActionCallback {
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

    invokeAsync(scenario: Scenario): void {
        const logDebug = function(debugMessage: string) {
            getLogger(scenario.name).debug(debugMessage, ctx);
        };

        const logError = function(errorMessage: string) {
            getLogger(scenario.name).error(errorMessage, ctx);
        };

        let ctx = { scenario: scenario.name, action: this.topic };

        // https://www.npmjs.com/package/mqtt#client
        const client = connect(
            this.url,
            {
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
            },
        );

        client.on('connect', () => {
            const log = getLogger(scenario.name);
            log.debug(
                `MQTT connection to ${this.url} successfully opened`,
                ctx,
            );

            const [payload, dataString] = this.protoFile
                ? this.encodeProtoPayload(scenario.cache, ctx)
                : this.genrateJsonPayload(scenario.cache, ctx);

            const topic = injectEvalAndVarsToString(
                this.topic,
                scenario.cache,
                ctx,
            ).toString();

            client.publish(topic, payload, (error?: any, packet?: any) => {
                if (error) {
                    log.error(
                        `Error while publishing to ${topic}: ${error}`,
                        ctx,
                    );
                } else {
                    log.debug(
                        `Successfully published message to '${topic}': ${dataString}`,
                        ctx,
                    );

                    if (this.protoFile) {
                        // log the hex dump of the sent proto payload
                        log.debug('-- Encoded proto data --');
                        log.debug(
                            `Base64: ${Buffer.from(
                                payload as Uint8Array,
                            ).toString('base64')}`,
                        );
                        log.debug('Hex:');
                        log.debug(hexdump(payload));
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
