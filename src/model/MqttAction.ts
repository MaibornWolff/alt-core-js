import { connect } from 'mqtt';
import { runInNewContext } from 'vm';
import { addMqttMessage, DiagramConfiguration } from '../diagramDrawing';
import { getLogger } from '../logging';
import { decodeProto } from '../protoParsing';
import { injectEvalAndVarsToString } from '../variableInjection';
import { Action } from './Action';
import { ActionCallback } from './ActionCallback';
import { ActionType } from './ActionType';
import { Scenario } from './Scenario';

class MqttAction implements Action {
    public name: string;

    public description: string;

    public type = ActionType.MQTT;

    public invokeEvenOnFail = false;

    public allowFailure = false;

    private url: string;

    private username: string;

    private password: string;

    private topic: string;

    private durationInSec: number;

    private expectedNumberOfMessages: number;

    private messageType: string;

    private messageFilter: string[];

    private protoFile: string;

    private protoClass: string;

    private readonly diagramConfiguration: DiagramConfiguration;

    public constructor(
        name: string,
        desc = name,
        actionDef: any,
        url = actionDef.url,
        username = actionDef.username,
        password = actionDef.password,
        topic = actionDef.topic,
        durationInSec = actionDef.durationInSec,
        expectedNumberOfMessages = actionDef.expectedNumberOfMessages,
        messageType = actionDef.messageType,
        messageFilter = actionDef.messageFilter,
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
        this.durationInSec = durationInSec;
        this.expectedNumberOfMessages = expectedNumberOfMessages;
        this.messageType = messageType;
        this.messageFilter = messageFilter;
        this.protoFile = protoFile;
        this.protoClass = protoClass;
        this.description = desc;
        this.invokeEvenOnFail = invokeEvenOnFail;
        this.allowFailure = allowFailure;
        this.diagramConfiguration = diagramConfiguration;
    }

    public static fromTemplate(
        mqttListenDefinition: any,
        template: MqttAction,
    ): MqttAction {
        return new MqttAction(
            template.name,
            mqttListenDefinition.description || mqttListenDefinition.name,
            { ...template, ...mqttListenDefinition },
        );
    }

    public invoke(scenario: Scenario): ActionCallback {
        const promise = new Promise((resolve, reject) => {
            this.invokeAsync(scenario, resolve, reject);
        });
        return { promise, cancel: () => console.log('TODO') };
    }

    public decodeProtoPayload(buffer: Buffer): { [k: string]: any } {
        return decodeProto(this.protoFile, this.protoClass, buffer);
    }

    private invokeAsync(
        scenario: Scenario,
        resolve: (value?: unknown) => void,
        reject: (reason?: unknown) => void,
    ): void {
        const registeredMessageFilters = this.messageFilter;
        const messageType = this.messageType || 'json';

        const logDebug = (debugMessage: string): void => {
            getLogger(scenario.name).debug(debugMessage, ctx);
        };

        const logError = (errorMessage: string): void => {
            getLogger(scenario.name).error(errorMessage, ctx);
        };

        const isMessageRelevant = (msg: unknown): boolean => {
            if (registeredMessageFilters) {
                return registeredMessageFilters.some(filter => {
                    const expandedFilter = injectEvalAndVarsToString(
                        filter,
                        scenario.cache,
                        ctx,
                    ).toString();
                    const filterResult = !!runInNewContext(expandedFilter, {
                        msg,
                    });
                    logDebug(`Filter (${expandedFilter}): ${filterResult}`);
                    return filterResult;
                });
            }
            return true;
        };

        const ctx = { scenario: scenario.name, action: this.topic };
        let numberOfRetrievedMessages = 0;

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
            logDebug(
                `MQTT connection to ${this.url} successfully opened for ${this.durationInSec}s`,
            );
            client.subscribe(this.topic, (error, granted) => {
                if (error) {
                    logError(
                        `Error while subscribing to ${this.topic}: ${error}`,
                    );
                    reject();
                } else {
                    logDebug(
                        `Successfully subscribed to '${granted[0].topic}' (qos: ${granted[0].qos})`,
                    );
                }
            });

            setTimeout(() => client.end(), this.durationInSec * 1000);
        });

        client.on('message', (topic, message) => {
            let msgObj = {};

            if (messageType === 'json') {
                msgObj = JSON.parse(message.toString());
            } else if (messageType === 'proto') {
                msgObj = this.decodeProtoPayload(message);
            }

            if (isMessageRelevant(msgObj)) {
                numberOfRetrievedMessages++;
                logDebug(
                    `Relevant MQTT update received (${numberOfRetrievedMessages}/${
                        this.expectedNumberOfMessages
                    }): ${JSON.stringify(msgObj)}`,
                );
                addMqttMessage(
                    scenario.name,
                    topic,
                    msgObj,
                    this.diagramConfiguration,
                );
            } else {
                logDebug(
                    `Irrelevant MQTT update received: ${JSON.stringify(
                        msgObj,
                    )}`,
                );
            }
        });

        client.on('reconnect', () => {
            logDebug(`MQTT client reconnected`);
        });

        client.on('close', () => {
            logDebug(`MQTT connection closed!`);
            if (numberOfRetrievedMessages !== this.expectedNumberOfMessages) {
                logError(
                    `Unexpected number of MQTT updates retrieved: ${numberOfRetrievedMessages} (expected: ${this.expectedNumberOfMessages})`,
                );
                reject();
            } else {
                resolve();
            }
        });

        client.on('error', error => {
            logError(`Error during connection: ${error}`);
            reject();
        });
    }
}

export { MqttAction };
