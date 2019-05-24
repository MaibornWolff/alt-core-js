import { connect } from 'mqtt';
import { addMqttMessage } from '../diagramDrawing';
import { getLogger } from '../logging';
import { decodeProto } from '../protoParsing';
import { injectEvalAndVarsToString } from '../variableInjection';
import { Action } from './Action';
import { ActionCallback } from './ActionCallback';
import { ActionType } from './ActionType';
import { Scenario } from './Scenario';

class MqttAction implements Action {
    name: string;

    description: string;

    type = ActionType.MQTT;

    url: string;

    username: string;

    password: string;

    topic: string;

    durationInSec: number;

    expectedNumberOfMessages: number;

    messageType: string;

    messageFilter: string[];

    protoFile: string;

    protoClass: string;

    invokeEvenOnFail = false;

    constructor(
        name: string,
        desc = name,
        mqttDefinition: any,
        url = mqttDefinition.url,
        username = mqttDefinition.username,
        password = mqttDefinition.password,
        topic = mqttDefinition.topic,
        durationInSec = mqttDefinition.durationInSec,
        expectedNumberOfMessages = mqttDefinition.expectedNumberOfMessages,
        messageType = mqttDefinition.messageType,
        messageFilter = mqttDefinition.messageFilter,
        protoFile = mqttDefinition.protoFile,
        protoClass = mqttDefinition.protoClass,
        invokeEvenOnFail = mqttDefinition.invokeEvenOnFail,
    ) {
        this.name = name;
        this.url = url;
        this.username = username;
        this.password = password;
        this.topic = topic;
        this.durationInSec = durationInSec;
        this.expectedNumberOfMessages = expectedNumberOfMessages;
        this.messageType = messageType;
        this.messageFilter = messageFilter;
        this.protoFile = protoFile;
        this.protoClass = protoClass;
        this.description = desc;
        this.invokeEvenOnFail = invokeEvenOnFail;
    }

    static fromTemplate(mqttDefinition: any, template: MqttAction): MqttAction {
        return new MqttAction(
            template.name,
            mqttDefinition.description || mqttDefinition.name,
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

    decodeProtoPayload(buffer: Buffer): any {
        return decodeProto(this.protoFile, this.protoClass, buffer);
    }

    invokeAsync(scenario: Scenario): void {
        const registeredMessageFilters = this.messageFilter;
        const messageType = this.messageType || 'json';

        const logDebug = function(debugMessage: string) {
            getLogger(scenario.name).debug(debugMessage, ctx);
        };

        const logError = function(errorMessage: string) {
            getLogger(scenario.name).error(errorMessage, ctx);
        };

        const isMessageRelevant = function(msg: any) {
            if (registeredMessageFilters) {
                return registeredMessageFilters.some(filter => {
                    filter = injectEvalAndVarsToString(
                        filter,
                        scenario.cache,
                        ctx,
                    ).toString();
                    const filterResult: boolean = eval(filter);
                    logDebug(`Filter (${filter}): ${filterResult}`);
                    return filterResult;
                });
            }
            return true;
        };

        let ctx = { scenario: scenario.name, action: this.topic };
        let numberOfRetrievedMessages = 0;

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
            getLogger(scenario.name).debug(
                `MQTT connection to ${this.url} successfully opened for ${
                    this.durationInSec
                }s`,
                ctx,
            );
            client.subscribe(this.topic, (error: any, granted: any) => {
                if (error) {
                    getLogger(scenario.name).error(
                        `Error while subscribing to ${this.topic}: ${error}`,
                        ctx,
                    );
                } else {
                    getLogger(scenario.name).debug(
                        `Successfully subscribed to '${
                            granted[0].topic
                        }' (qos: ${granted[0].qos})`,
                        ctx,
                    );
                }
            });

            setTimeout(() => client.end(), this.durationInSec * 1000);
        });

        client.on('message', (topic: any, message: any) => {
            let msgObj = {};

            if (messageType === 'json') {
                msgObj = JSON.parse(message.toString());
            } else if (messageType == 'proto') {
                msgObj = this.decodeProtoPayload(message);
            }

            if (isMessageRelevant(msgObj)) {
                numberOfRetrievedMessages++;
                logDebug(
                    `Relevant MQTT update received (${numberOfRetrievedMessages}/${
                        this.expectedNumberOfMessages
                    }): ${JSON.stringify(msgObj)}`,
                );
                addMqttMessage(scenario.name, topic, msgObj);
            } else {
                logDebug(
                    `Irrelevant MQTT update received: ${JSON.stringify(
                        msgObj,
                    )}`,
                );
            }
        });

        client.on('reconnect', () => {
            getLogger(scenario.name).debug(`MQTT client reconnected`, ctx);
        });

        client.on('close', () => {
            getLogger(scenario.name).debug(`MQTT connection closed!`, ctx);
            if (numberOfRetrievedMessages !== this.expectedNumberOfMessages) {
                getLogger(scenario.name).error(
                    `Unexpected number of MQTT updates retrieved: ${numberOfRetrievedMessages} (expected: ${
                        this.expectedNumberOfMessages
                    })`,
                    ctx,
                );
            }
        });

        client.on('error', (error: any) => {
            getLogger(scenario.name).error(
                `Error during connection: ${error}`,
                ctx,
            );
        });
    }
}

export { MqttAction };
