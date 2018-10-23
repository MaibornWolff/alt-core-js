"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var logging_1 = require("../logging");
var RestAction_1 = require("./RestAction");
var ActionType_1 = require("./ActionType");
var TimerAction_1 = require("./TimerAction");
var WebSocketAction_1 = require("./WebSocketAction");
var MqttAction_1 = require("./MqttAction");
var MqttPublishAction_1 = require("./MqttPublishAction");
var Scenario = /** @class */ (function () {
    function Scenario(fileName, yamlConfig, actionConfig) {
        var _this = this;
        this.actions = [];
        this.name = fileName;
        this.description = yamlConfig.description;
        yamlConfig.actions.forEach(function (actionDef) {
            var actionTemplate = actionConfig.find(function (c) { return c.name === actionDef.name; });
            if (actionTemplate) {
                switch (actionTemplate.type) {
                    case ActionType_1.ActionType.REST:
                        _this.actions.push(RestAction_1.RestAction.fromTemplate(actionDef, actionTemplate));
                        break;
                    case ActionType_1.ActionType.TIMER:
                        _this.actions.push(TimerAction_1.TimerAction.fromTemplate(actionDef, actionTemplate));
                        break;
                    case ActionType_1.ActionType.WEBSOCKET:
                        _this.actions.push(WebSocketAction_1.WebSocketAction.fromTemplate(actionDef, actionTemplate));
                        break;
                    case ActionType_1.ActionType.MQTT:
                        _this.actions.push(MqttAction_1.MqttAction.fromTemplate(actionDef, actionTemplate));
                        break;
                    case ActionType_1.ActionType.MQTT_PUBLISH:
                        _this.actions.push(MqttPublishAction_1.MqttPublishAction.fromTemplate(actionDef, actionTemplate));
                        break;
                }
            }
            else {
                logging_1.getLogger(_this.name).error("ERROR: Could not find any Action definition for: " + actionDef.name, { scenario: _this.name });
            }
        });
        this.cache = new Map(yamlConfig.variables ? Object.entries(yamlConfig.variables) : []);
    }
    return Scenario;
}());
exports.Scenario = Scenario;
