import { readdirSync } from 'fs';
import { getLogger } from './logging';
import { Action } from './model/Action';
import { ActionType } from './model/ActionType';
import { MqttAction } from './model/MqttAction';
import { MqttPublishAction } from './model/MqttPublishAction';
import { RestAction } from './model/RestAction';
import { TimerAction } from './model/TimerAction';
import { WebSocketAction } from './model/WebSocketAction';
import { loadYamlConfiguration, nameFromYamlConfig } from './yamlParsing';

const isRestAction = function(actionDef: any) {
    return actionDef && actionDef.type === ActionType[ActionType.REST];
};

const isTimerAction = function(actionDef: any) {
    return actionDef && actionDef.type === ActionType[ActionType.TIMER];
};

const isWebsocketAction = function(actionDef: any) {
    return actionDef && actionDef.type === ActionType[ActionType.WEBSOCKET];
};

const isMqttAction = function(actionDef: any) {
    return actionDef && actionDef.type === ActionType[ActionType.MQTT];
};

const isMqttPublishAction = function(actionDef: any) {
    return actionDef && actionDef.type === ActionType[ActionType.MQTT_PUBLISH];
};

/* TODO */
export const loadAllActions = (actionDir: string, envConfig: any): Action[] => {
    const loadedActions: Action[] = [];

    readdirSync(actionDir).forEach((file: any) => {
        const actionDef = loadYamlConfiguration(`${actionDir}/${file}`);

        if (isRestAction(actionDef)) {
            // the host is either declared directly in the action template or will be loaded from evn-config file
            const host = actionDef.service.startsWith('http')
                ? actionDef.service
                : // if not defined 'https' will be prepended automatically
                envConfig[actionDef.service].startsWith('http')
                ? envConfig[actionDef.service]
                : `https://${envConfig[actionDef.service]}`;
            loadedActions.push(
                new RestAction(
                    nameFromYamlConfig(file),
                    null,
                    actionDef,
                    host + actionDef.endpoint,
                    actionDef.service,
                ),
            );
        } else if (isTimerAction(actionDef)) {
            loadedActions.push(
                new TimerAction(nameFromYamlConfig(file), null, actionDef),
            );
        } else if (isWebsocketAction(actionDef)) {
            loadedActions.push(
                new WebSocketAction(
                    nameFromYamlConfig(file),
                    null,
                    actionDef,
                    actionDef.service,
                    `wss://${envConfig[actionDef.service]}${
                        actionDef.endpoint
                    }`,
                ),
            );
        } else if (isMqttAction(actionDef)) {
            loadedActions.push(
                new MqttAction(nameFromYamlConfig(file), null, actionDef),
            );
        } else if (isMqttPublishAction(actionDef)) {
            loadedActions.push(
                new MqttPublishAction(
                    nameFromYamlConfig(file),
                    null,
                    actionDef,
                ),
            );
        } else {
            getLogger('unknown').error(
                `Unknown type of Action: ${actionDef.type}`,
            );
        }
    });

    return loadedActions;
};
