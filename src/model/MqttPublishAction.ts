import {Action} from "./Action";
import {ActionType} from "./ActionType";
import {getLogger} from "../logging";
import {Scenario} from "./Scenario";
import {ActionCallback} from "./ActionCallback";
import {injectEvaluationToMap, injectVarsToString} from "../variableInjection";
import {addMqttPublishMessage} from "../diagramDrawing";
import {encodeProto} from "../protoParsing";
import hexdump = require("hexdump-nodejs");

const Mqtt = require('mqtt');

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

    constructor(name: string, mqttDefinition: any, url = mqttDefinition.url, username = mqttDefinition.username, password = mqttDefinition.password,
                topic = mqttDefinition.topic, data = mqttDefinition.data, protoFile = mqttDefinition.protoFile, protoClass = mqttDefinition.protoClass
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

    static fromTemplate(mqttDefinition: any, template: MqttPublishAction): MqttPublishAction {
        return new MqttPublishAction(
            template.name,
            Object.assign(Object.assign({}, template), mqttDefinition)
        );
    }

    invoke(scenario: Scenario): ActionCallback {
        let promise = new Promise((resolve => {
            this.invokeAsync(scenario);
            resolve();
        }));
        return { promise, cancel: () => console.log("TODO") };
    }

    encodeProtoPayload(scenarioVariables: Map<string, string>, ctx = {}): any {
        let data = injectEvaluationToMap(this.data, ctx, scenarioVariables);
        return encodeProto(this.protoFile, data, this.protoClass);
    }

    invokeAsync(scenario: Scenario): void {

        const logDebug = function (debugMessage: string) {
            getLogger(scenario.name).debug(debugMessage, ctx);
        };

        const logError = function (errorMessage: string) {
            getLogger(scenario.name).error(errorMessage, ctx);
        };

        let ctx = {scenario: scenario.name, action: this.topic};

        // https://www.npmjs.com/package/mqtt#client
        const client = Mqtt.connect(this.url, {
            username: this.username,
            password: this.password,
            keepalive: 60,
            clientId: this.name + Math.random().toString(16).substr(2, 8),
            clean: true,
            reconnectPeriod: 1000,
            connectTimeout: 30000,
            resubscribe: true
        });

        client.on('connect', () => {
            let log = getLogger(scenario.name);
            log.debug(`MQTT connection to ${this.url} successfully opened`, ctx);

            let dataString = JSON.stringify(injectEvaluationToMap(this.data, ctx, scenario.cache));
            let payload = this.protoFile ? this.encodeProtoPayload(scenario.cache, ctx) : dataString;
            let topic = injectVarsToString(this.topic, scenario.cache, ctx);

            client.publish(topic, payload, (error?: any, packet?: any) => {
                if (error) {
                    log.error(`Error while publishing to ${topic}: ${error}`, ctx);
                } else {
                    log.debug(`Successfully published message to '${topic}': ${dataString}`, ctx);

                    if (this.protoFile) {
                        // log the hex dump of the sent proto payload
                        log.debug("-- Encoded proto data --");
                        log.debug("Base64: " + Buffer.from(payload).toString('base64'));
                        log.debug("Hex:");
                        log.debug(hexdump(payload));
                    }

                    addMqttPublishMessage(scenario.name, topic, `{"payload":${dataString}}`);
                    client.end();
                }
            });

        });

        // client.on('close', () => {
        //     getLogger(scenario.name).debug(`MQTT connection closed!`, ctx);
        // });

        client.on('error', (error: any) => {
            getLogger(scenario.name).error(`Error during connection: ${error}`, ctx);
        });
    }
}

export { MqttPublishAction }