"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ActionType;
(function (ActionType) {
    ActionType[ActionType["REST"] = 0] = "REST";
    ActionType[ActionType["TIMER"] = 1] = "TIMER";
    ActionType[ActionType["WEBSOCKET"] = 2] = "WEBSOCKET";
    ActionType[ActionType["MQTT"] = 3] = "MQTT";
    ActionType[ActionType["MQTT_PUBLISH"] = 4] = "MQTT_PUBLISH";
})(ActionType || (ActionType = {}));
exports.ActionType = ActionType;
