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

    readdirSync(actionDir).forEach((file: any) => {
        const actionDef = loadYamlConfiguration(`${actionDir}/${file}`);

        if (isRestAction(actionDef)) {
            const host = getHost(actionDef, envConfig);
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

/**
 * Extracts the host from the action definition if present or from the
 * environment configuration. If the http protocol is not specified explicitly,
 * https is assumed.
 * @param actionDef The action definition
 * @param envConfig The environment configuration
 */
const getHost = (actionDef: any, envConfig: any): string => {
    if (actionDef.service.startsWith('http')) {
        return actionDef.service;
    }
    if (envConfig[actionDef.service].startsWith('http')) {
        return envConfig[actionDef.service];
    }
    return `https://${envConfig[actionDef.service]}`;
};
