"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ActionType_1 = require("./ActionType");
var logging_1 = require("../logging");
var variableInjection_1 = require("../variableInjection");
var diagramDrawing_1 = require("../diagramDrawing");
var protoParsing_1 = require("../protoParsing");
var Mqtt = require('mqtt');
var MqttAction = /** @class */ (function () {
    function MqttAction(name, mqttDefinition, url, username, password, topic, durationInSec, expectedNumberOfMessages, messageType, messageFilter, protoFile, protoClass) {
        if (url === void 0) { url = mqttDefinition.url; }
        if (username === void 0) { username = mqttDefinition.username; }
        if (password === void 0) { password = mqttDefinition.password; }
        if (topic === void 0) { topic = mqttDefinition.topic; }
        if (durationInSec === void 0) { durationInSec = mqttDefinition.durationInSec; }
        if (expectedNumberOfMessages === void 0) { expectedNumberOfMessages = mqttDefinition.expectedNumberOfMessages; }
        if (messageType === void 0) { messageType = mqttDefinition.messageType; }
        if (messageFilter === void 0) { messageFilter = mqttDefinition.messageFilter; }
        if (protoFile === void 0) { protoFile = mqttDefinition.protoFile; }
        if (protoClass === void 0) { protoClass = mqttDefinition.protoClass; }
        this.type = ActionType_1.ActionType.MQTT;
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
    }
    MqttAction.fromTemplate = function (mqttDefinition, template) {
        return new MqttAction(template.name, Object.assign(Object.assign({}, template), mqttDefinition));
    };
    MqttAction.prototype.invoke = function (scenario) {
        var _this = this;
        var promise = new Promise((function (resolve) {
            _this.invokeAsync(scenario);
            resolve();
        }));
        return { promise: promise, cancel: function () { return console.log("TODO"); } };
    };
    MqttAction.prototype.decodeProtoPayload = function (buffer) {
        return protoParsing_1.decodeProto(this.protoFile, this.protoClass, buffer);
    };
    MqttAction.prototype.invokeAsync = function (scenario) {
        var _this = this;
        var registeredMessageFilters = this.messageFilter;
        var messageType = this.messageType || "json";
        var logDebug = function (debugMessage) {
            logging_1.getLogger(scenario.name).debug(debugMessage, ctx);
        };
        var logError = function (errorMessage) {
            logging_1.getLogger(scenario.name).error(errorMessage, ctx);
        };
        var isMessageRelevant = function (msg) {
            if (registeredMessageFilters) {
                return registeredMessageFilters.some(function (filter) {
                    filter = variableInjection_1.injectVarsToString(filter, scenario.cache, ctx);
                    var filterResult = eval(filter);
                    logDebug("Filter (" + filter + "): " + filterResult);
                    return filterResult;
                });
            }
            return true;
        };
        var ctx = { scenario: scenario.name, action: this.topic };
        var numberOfRetrievedMessages = 0;
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
            logging_1.getLogger(scenario.name).debug("MQTT connection to " + _this.url + " successfully opened for " + _this.durationInSec + "s", ctx);
            client.subscribe(_this.topic, function (error, granted) {
                if (error) {
                    logging_1.getLogger(scenario.name).error("Error while subscribing to " + _this.topic + ": " + error, ctx);
                }
                else {
                    logging_1.getLogger(scenario.name).debug("Successfully subscribed to '" + granted[0].topic + "' (qos: " + granted[0].qos + ")", ctx);
                }
            });
            setTimeout(function () { return client.end(); }, _this.durationInSec * 1000);
        });
        client.on('message', function (topic, message) {
            var msgObj = {};
            if (messageType === "json") {
                msgObj = JSON.parse(message.toString());
            }
            else if (messageType == "proto") {
                msgObj = _this.decodeProtoPayload(message);
            }
            if (isMessageRelevant(msgObj)) {
                numberOfRetrievedMessages++;
                logDebug("Relevant MQTT update received (" + numberOfRetrievedMessages + "/" + _this.expectedNumberOfMessages + "): " + JSON.stringify(msgObj));
                diagramDrawing_1.addMqttMessage(scenario.name, topic, msgObj);
            }
            else {
                logDebug("Irrelevant MQTT update received: " + JSON.stringify(msgObj));
            }
        });
        client.on('reconnect', function () {
            logging_1.getLogger(scenario.name).debug("MQTT client reconnected", ctx);
        });
        client.on('close', function () {
            logging_1.getLogger(scenario.name).debug("MQTT connection closed!", ctx);
            if (numberOfRetrievedMessages !== _this.expectedNumberOfMessages) {
                logging_1.getLogger(scenario.name).error("Unexpected number of MQTT updates retrieved: " + numberOfRetrievedMessages + " (expected: " + _this.expectedNumberOfMessages + ")", ctx);
            }
        });
        client.on('error', function (error) {
            logging_1.getLogger(scenario.name).error("Error during connection: " + error, ctx);
        });
    };
    return MqttAction;
}());
exports.MqttAction = MqttAction;
