"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ActionType_1 = require("./ActionType");
var logging_1 = require("../logging");
var querystring_1 = require("querystring");
var variableInjection_1 = require("../variableInjection");
var util_1 = require("util");
var diagramDrawing_1 = require("../diagramDrawing");
var WebSocket = require('ws');
var MAX_RECONNECTIONS = 3;
var WebSocketAction = /** @class */ (function () {
    function WebSocketAction(name, wsDefinition, serviceName, url, headers, data, expectedNumberOfMessages, messageFilter) {
        if (url === void 0) { url = wsDefinition.url; }
        if (headers === void 0) { headers = wsDefinition.headers; }
        if (data === void 0) { data = wsDefinition.data; }
        if (expectedNumberOfMessages === void 0) { expectedNumberOfMessages = wsDefinition.expectedNumberOfMessages; }
        if (messageFilter === void 0) { messageFilter = wsDefinition.messageFilter; }
        this.reconnected = 0;
        this.type = ActionType_1.ActionType.WEBSOCKET;
        this.name = name;
        this.serviceName = serviceName;
        this.url = url;
        this.headers = headers;
        this.data = data;
        this.expectedNumberOfMessages = expectedNumberOfMessages;
        this.messageFilter = messageFilter;
        this.receivedMessages = new Set();
    }
    WebSocketAction.fromTemplate = function (wsDefinition, template) {
        return new WebSocketAction(template.name, wsDefinition, template.serviceName, template.url, template.headers ? Object.assign(Object.assign({}, template.headers), wsDefinition.headers) : wsDefinition.restHead, this.loadData(template, wsDefinition), wsDefinition.expectedNumberOfMessages || template.expectedNumberOfMessages);
    };
    WebSocketAction.loadData = function (template, actionDef) {
        if (template.data) {
            if (util_1.isArray(template.data))
                return template.data.concat(actionDef.data || []);
            else
                return Object.assign(Object.assign({}, template.data), actionDef.data);
        }
        else {
            return actionDef.data;
        }
    };
    WebSocketAction.prototype.invoke = function (scenario) {
        var _this = this;
        var promise = new Promise((function (resolve) {
            _this.invokeAsync(scenario);
            resolve();
        }));
        return {
            promise: promise,
            cancel: function () { return _this.wsInstance.close(); }
        };
    };
    WebSocketAction.prototype.invokeAsync = function (scenario) {
        var _this = this;
        var ctx = { scenario: scenario.name, action: this.name };
        var resolvedUrl = variableInjection_1.injectVarsToString(this.url, scenario.cache, ctx);
        var queryParams = variableInjection_1.injectVarsToMap(this.headers, scenario.cache, ctx);
        var registeredMessageFilters = this.messageFilter;
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
        this.wsInstance = new WebSocket(resolvedUrl + "?" + querystring_1.stringify(queryParams));
        this.wsInstance.on('open', function () {
            logDebug("WebSocket to " + resolvedUrl + " successfully opened!");
            if (_this.data && _this.reconnected == 0) {
                var payload = JSON.stringify(_this.data);
                _this.wsInstance.send(payload);
                logDebug("WS message sent: " + payload);
            }
        });
        this.wsInstance.on('message', function (data) {
            var parsedMessage = JSON.parse(data.toString());
            if (isMessageRelevant(parsedMessage)) {
                _this.receivedMessages.add(data);
                logDebug("Relevant WS message received (" + _this.receivedMessages.size + "/" + _this.expectedNumberOfMessages + "): " + data);
                diagramDrawing_1.addWsMessage(scenario.name, _this.serviceName, parsedMessage);
            }
        });
        this.wsInstance.on('close', function (code) {
            if (code === 1006 && _this.reconnected <= MAX_RECONNECTIONS) {
                logDebug('reconnecting...');
                _this.reconnected++;
                _this.invokeAsync(scenario);
            }
            else {
                logDebug('Successfully closed WS connection: ' + code);
                if (_this.receivedMessages.size !== _this.expectedNumberOfMessages) {
                    logError("Unexpected number of messages retrieved: " + _this.receivedMessages.size + " (expected: " + _this.expectedNumberOfMessages + ")");
                }
            }
        });
        this.wsInstance.on('error', function (err) {
            logError('' + err);
        });
    };
    return WebSocketAction;
}());
exports.WebSocketAction = WebSocketAction;
