"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var yamlParsing_1 = require("./yamlParsing");
var ActionType_1 = require("./model/ActionType");
var RestAction_1 = require("./model/RestAction");
var TimerAction_1 = require("./model/TimerAction");
var logging_1 = require("./logging");
var WebSocketAction_1 = require("./model/WebSocketAction");
var MqttAction_1 = require("./model/MqttAction");
var MqttPublishAction_1 = require("./model/MqttPublishAction");
var FS = require('fs');
var isRestAction = function (actionDef) {
    return actionDef && actionDef.type === ActionType_1.ActionType[ActionType_1.ActionType.REST];
};
var isTimerAction = function (actionDef) {
    return actionDef && actionDef.type === ActionType_1.ActionType[ActionType_1.ActionType.TIMER];
};
var isWebsocketAction = function (actionDef) {
    return actionDef && actionDef.type === ActionType_1.ActionType[ActionType_1.ActionType.WEBSOCKET];
};
var isMqttAction = function (actionDef) {
    return actionDef && actionDef.type === ActionType_1.ActionType[ActionType_1.ActionType.MQTT];
};
var isMqttPublishAction = function (actionDef) {
    return actionDef && actionDef.type === ActionType_1.ActionType[ActionType_1.ActionType.MQTT_PUBLISH];
};
/* TODO */
exports.loadAllActions = function (actionDir, envConfig) {
    var loadedActions = [];
    FS.readdirSync(actionDir).forEach(function (file) {
        var actionDef = yamlParsing_1.loadYamlConfiguration(actionDir + "/" + file);
        if (isRestAction(actionDef)) {
            // the host is either declared directly in the action template or will be loaded from evn-config file
            var host = actionDef.service.startsWith('http') ?
                actionDef.service
                :
                    // if not defined 'https' will be prepended automatically
                    envConfig[actionDef.service].startsWith('http') ? envConfig[actionDef.service] : 'https://' + envConfig[actionDef.service];
            loadedActions.push(new RestAction_1.RestAction(yamlParsing_1.nameFromYamlConfig(file), actionDef, host + actionDef.endpoint, actionDef.service));
        }
        else if (isTimerAction(actionDef)) {
            loadedActions.push(new TimerAction_1.TimerAction(yamlParsing_1.nameFromYamlConfig(file), actionDef));
        }
        else if (isWebsocketAction(actionDef)) {
            loadedActions.push(new WebSocketAction_1.WebSocketAction(yamlParsing_1.nameFromYamlConfig(file), actionDef, actionDef.service, 'wss://' + envConfig[actionDef.service] + actionDef.endpoint));
        }
        else if (isMqttAction(actionDef)) {
            loadedActions.push(new MqttAction_1.MqttAction(yamlParsing_1.nameFromYamlConfig(file), actionDef));
        }
        else if (isMqttPublishAction(actionDef)) {
            loadedActions.push(new MqttPublishAction_1.MqttPublishAction(yamlParsing_1.nameFromYamlConfig(file), actionDef));
        }
        else {
            logging_1.getLogger("unknown").error("Unknown type of Action: " + actionDef.type);
        }
    });
    return loadedActions;
};
