import { loadYamlConfiguration, nameFromYamlConfig } from './yamlParsing';
import { ActionType } from './model/ActionType';
import { RestAction } from './model/RestAction';
import { TimerAction } from './model/TimerAction';
import { Action } from './model/Action';
import { getLogger } from './logging';
import { WebSocketAction } from './model/WebSocketAction';
import { MqttAction } from './model/MqttAction';
import { MqttPublishAction } from './model/MqttPublishAction';

const FS = require('fs');

let isRestAction = function(actionDef: any) {
    return actionDef && actionDef.type === ActionType[ActionType.REST];
};

let isTimerAction = function(actionDef: any) {
    return actionDef && actionDef.type === ActionType[ActionType.TIMER];
};

let isWebsocketAction = function(actionDef: any) {
    return actionDef && actionDef.type === ActionType[ActionType.WEBSOCKET];
};

let isMqttAction = function(actionDef: any) {
    return actionDef && actionDef.type === ActionType[ActionType.MQTT];
};

let isMqttPublishAction = function(actionDef: any) {
    return actionDef && actionDef.type === ActionType[ActionType.MQTT_PUBLISH];
};

/* TODO */
export const loadAllActions = (actionDir: string, envConfig: any): Action[] => {
    let loadedActions: Action[] = [];

    FS.readdirSync(actionDir).forEach((file: any) => {
        let actionDef = loadYamlConfiguration(`${actionDir}/${file}`);

        if (isRestAction(actionDef)) {
            // the host is either declared directly in the action template or will be loaded from evn-config file
            let host = actionDef.service.startsWith('http')
                ? actionDef.service
                : // if not defined 'https' will be prepended automatically
                envConfig[actionDef.service].startsWith('http')
                ? envConfig[actionDef.service]
                : 'https://' + envConfig[actionDef.service];
            loadedActions.push(
                new RestAction(
                    nameFromYamlConfig(file),
                    actionDef,
                    host + actionDef.endpoint,
                    actionDef.service,
                ),
            );
        } else if (isTimerAction(actionDef)) {
            loadedActions.push(
                new TimerAction(nameFromYamlConfig(file), actionDef),
            );
        } else if (isWebsocketAction(actionDef)) {
            loadedActions.push(
                new WebSocketAction(
                    nameFromYamlConfig(file),
                    actionDef,
                    actionDef.service,
                    'wss://' +
                        envConfig[actionDef.service] +
                        actionDef.endpoint,
                ),
            );
        } else if (isMqttAction(actionDef)) {
            loadedActions.push(
                new MqttAction(nameFromYamlConfig(file), actionDef),
            );
        } else if (isMqttPublishAction(actionDef)) {
            loadedActions.push(
                new MqttPublishAction(nameFromYamlConfig(file), actionDef),
            );
        } else {
            getLogger('unknown').error(
                `Unknown type of Action: ${actionDef.type}`,
            );
        }
    });

    return loadedActions;
};
