"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ActionType_1 = require("./ActionType");
var logging_1 = require("../logging");
var variableInjection_1 = require("../variableInjection");
var diagramDrawing_1 = require("../diagramDrawing");
var util_1 = require("util");
var Mqtt = require('mqtt');
var MqttPublishAction = /** @class */ (function () {
    function MqttPublishAction(name, mqttDefinition, url, username, password, topic, data, isByte) {
        if (url === void 0) { url = mqttDefinition.url; }
        if (username === void 0) { username = mqttDefinition.username; }
        if (password === void 0) { password = mqttDefinition.password; }
        if (topic === void 0) { topic = mqttDefinition.topic; }
        if (data === void 0) { data = mqttDefinition.data; }
        if (isByte === void 0) { isByte = mqttDefinition.isByte; }
        this.type = ActionType_1.ActionType.MQTT_PUBLISH;
        this.name = name;
        this.url = url;
        this.username = username;
        this.password = password;
        this.topic = topic;
        this.data = data;
        this.isByte = isByte ? isByte : false;
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
    MqttPublishAction.prototype.invokeAsync = function (scenario) {
        var _this = this;
        var binArrayToString = function (array) { return array.map(function (byte) { return String.fromCharCode(parseInt(byte, 2)); }).join(''); };
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
            logging_1.getLogger(scenario.name).debug("MQTT connection to " + _this.url + " successfully opened", ctx);
            // let payload = JSON.stringify(injectEvaluationToMap(this.data, ctx));
            var payload = _this.isByte ?
                new util_1.TextDecoder('utf-8').decode(new Uint8Array(JSON.parse(_this.data)))
                :
                    JSON.stringify(variableInjection_1.injectEvaluationToMap(_this.data, ctx));
            client.publish(_this.topic, payload, function (error, packet) {
                if (error) {
                    logging_1.getLogger(scenario.name).error("Error while publishing to " + _this.topic + ": " + error, ctx);
                }
                else {
                    logging_1.getLogger(scenario.name).debug("Successfully published message to '" + _this.topic + "': " + payload, ctx);
                    if (_this.isByte) {
                        diagramDrawing_1.addMqttPublishMessage(scenario.name, _this.topic, "{\"payload\":\"" + _this.data + "\"}");
                    }
                    else {
                        diagramDrawing_1.addMqttPublishMessage(scenario.name, _this.topic, payload);
                    }
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
