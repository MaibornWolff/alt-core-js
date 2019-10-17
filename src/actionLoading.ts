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

const isRestAction = (actionDef: any): boolean =>
    actionDef && actionDef.type === ActionType[ActionType.REST];

const isTimerAction = (actionDef: any): boolean =>
    actionDef && actionDef.type === ActionType[ActionType.TIMER];

const isWebsocketAction = (actionDef: any): boolean =>
    actionDef && actionDef.type === ActionType[ActionType.WEBSOCKET];

const isMqttAction = (actionDef: any): boolean =>
    actionDef && actionDef.type === ActionType[ActionType.MQTT];

const isMqttPublishAction = (actionDef: any): boolean =>
    actionDef && actionDef.type === ActionType[ActionType.MQTT_PUBLISH];

/* TODO */
export const loadAllActions = (actionDir: string, envConfig: any): Action[] => {
    const loadedActions: Action[] = [];

    readdirSync(actionDir, { withFileTypes: true })
        .filter(dirent => dirent.isFile())
        .map(dirent => dirent.name)
        .forEach(file => {
            const actionDef = loadYamlConfiguration(`${actionDir}/${file}`);

            if (isRestAction(actionDef)) {
                const host = getHost(actionDef, envConfig);
                loadedActions.push(
                    new RestAction(
                        nameFromYamlConfig(file),
                        undefined,
                        actionDef,
                        host + actionDef.endpoint,
                        actionDef.service,
                    ),
                );
            } else if (isTimerAction(actionDef)) {
                loadedActions.push(
                    new TimerAction(
                        nameFromYamlConfig(file),
                        undefined,
                        actionDef,
                    ),
                );
            } else if (isWebsocketAction(actionDef)) {
                const host = getHost(actionDef, envConfig);
                loadedActions.push(
                    new WebSocketAction(
                        nameFromYamlConfig(file),
                        undefined,
                        actionDef,
                        actionDef.service,
                        host + actionDef.endpoint,
                    ),
                );
            } else if (isMqttAction(actionDef)) {
                loadedActions.push(
                    new MqttAction(
                        nameFromYamlConfig(file),
                        undefined,
                        actionDef,
                    ),
                );
            } else if (isMqttPublishAction(actionDef)) {
                loadedActions.push(
                    new MqttPublishAction(
                        nameFromYamlConfig(file),
                        undefined,
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

/**
 * Extracts the host from the action definition if present or from the
 * environment configuration. In case of REST actions, if the http protocol is
 * not specified explicitly, https is assumed. In case of WebSocket actions, if
 * the ws protocol is not specified explicitly, wss is assumed.
 * @param actionDef The action definition
 * @param envConfig The environment configuration
 */
const getHost = (actionDef: any, envConfig: any): string | undefined => {
    if (isRestAction(actionDef)) {
        if (actionDef.service.startsWith('http')) {
            return actionDef.service;
        }
        if (envConfig[actionDef.service].startsWith('http')) {
            return envConfig[actionDef.service];
        }
        return `https://${envConfig[actionDef.service]}`;
    }
    if (isWebsocketAction(actionDef)) {
        if (actionDef.service.startsWith('ws')) {
            return actionDef.service;
        }
        if (envConfig[actionDef.service].startsWith('ws')) {
            return envConfig[actionDef.service];
        }
        return `wss://${envConfig[actionDef.service]}`;
    }
    return undefined;
};
