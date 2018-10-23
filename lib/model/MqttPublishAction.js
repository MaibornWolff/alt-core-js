"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ActionType_1 = require("./ActionType");
var logging_1 = require("../logging");
var variableInjection_1 = require("../variableInjection");
var diagramDrawing_1 = require("../diagramDrawing");
var protoParsing_1 = require("../protoParsing");
var hexdump = require("hexdump-nodejs");
var Mqtt = require('mqtt');
var MqttPublishAction = /** @class */ (function () {
    function MqttPublishAction(name, mqttDefinition, url, username, password, topic, data, protoFile, protoClass) {
        if (url === void 0) { url = mqttDefinition.url; }
        if (username === void 0) { username = mqttDefinition.username; }
        if (password === void 0) { password = mqttDefinition.password; }
        if (topic === void 0) { topic = mqttDefinition.topic; }
        if (data === void 0) { data = mqttDefinition.data; }
        if (protoFile === void 0) { protoFile = mqttDefinition.protoFile; }
        if (protoClass === void 0) { protoClass = mqttDefinition.protoClass; }
        this.type = ActionType_1.ActionType.MQTT_PUBLISH;
        this.name = name;
        this.url = url;
        this.username = username;
        this.password = password;
        this.topic = topic;
        this.data = data;
        this.protoFile = protoFile;
        this.protoClass = protoClass;
    }
    MqttPublishAction.fromTemplate = function (mqttDefinition, template) {
        return new MqttPublishAction(template.name, Object.assign(Object.assign({}, template), mqttDefinition));
    };
    MqttPublishAction.prototype.invoke = function (scenario) {
        var _this = this;
        var promise = new Promise((function (resolve) {
            _this.invokeAsync(scenario);
            resolve();
        }));
        return { promise: promise, cancel: function () { return console.log("TODO"); } };
    };
    MqttPublishAction.prototype.encodeProtoPayload = function (scenarioVariables, ctx) {
        if (ctx === void 0) { ctx = {}; }
        var data = variableInjection_1.injectEvaluationToMap(this.data, ctx, scenarioVariables);
        return protoParsing_1.encodeProto(this.protoFile, data, this.protoClass);
    };
    MqttPublishAction.prototype.invokeAsync = function (scenario) {
        var _this = this;
        var logDebug = function (debugMessage) {
            logging_1.getLogger(scenario.name).debug(debugMessage, ctx);
        };
        var logError = function (errorMessage) {
            logging_1.getLogger(scenario.name).error(errorMessage, ctx);
        };
        var ctx = { scenario: scenario.name, action: this.topic };
        // https://www.npmjs.com/package/mqtt#client
        var client = Mqtt.connect(this.url, {
            username: this.username,
            password: this.password,
            keepalive: 60,
            clientId: this.name + Math.random().toString(16).substr(2, 8),
            clean: true,
            reconnectPeriod: 1000,
            connectTimeout: 30000,
            resubscribe: true
        });
        client.on('connect', function () {
            var log = logging_1.getLogger(scenario.name);
            log.debug("MQTT connection to " + _this.url + " successfully opened", ctx);
            var dataString = JSON.stringify(variableInjection_1.injectEvaluationToMap(_this.data, ctx, scenario.cache));
            var payload = _this.protoFile ? _this.encodeProtoPayload(scenario.cache, ctx) : dataString;
            var topic = variableInjection_1.injectVarsToString(_this.topic, scenario.cache, ctx);
            client.publish(topic, payload, function (error, packet) {
                if (error) {
                    log.error("Error while publishing to " + topic + ": " + error, ctx);
                }
                else {
                    log.debug("Successfully published message to '" + topic + "': " + dataString, ctx);
                    if (_this.protoFile) {
                        // log the hex dump of the sent proto payload
                        log.debug("-- Encoded proto data --");
                        log.debug("Base64: " + Buffer.from(payload).toString('base64'));
                        log.debug("Hex:");
                        log.debug(hexdump(payload));
                    }
                    diagramDrawing_1.addMqttPublishMessage(scenario.name, topic, "{\"payload\":" + dataString + "}");
                    client.end();
                }
            });
        });
        // client.on('close', () => {
        //     getLogger(scenario.name).debug(`MQTT connection closed!`, ctx);
        // });
        client.on('error', function (error) {
            logging_1.getLogger(scenario.name).error("Error during connection: " + error, ctx);
        });
    };
    return MqttPublishAction;
}());
exports.MqttPublishAction = MqttPublishAction;
