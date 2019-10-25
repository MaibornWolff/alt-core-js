import { readdirSync } from 'fs';
import { getLogger } from './logging';
import {
    Action,
    ActionDefinition,
    isValidActionDefinition,
} from './model/Action';
import { ActionType } from './model/ActionType';
import { MqttAction } from './model/MqttAction';
import { MqttPublishAction } from './model/MqttPublishAction';
import {
    isRestActionDefinition,
    RestAction,
    RestActionDefinition,
} from './model/RestAction';
import { TimerAction } from './model/TimerAction';
import {
    isWebSocketActionDefinition,
    WebSocketAction,
    WebSocketActionDefinition,
} from './model/WebSocketAction';
import { loadYamlConfiguration, nameFromYamlConfig } from './yamlParsing';
import {
    isValidAMQPListenActionDefinition,
    AMQPListenAction,
    AMQPListenActionDefinition,
} from './model/AMQPListenAction';

const isTimerAction = (actionDef: ActionDefinition): boolean =>
    actionDef && actionDef.type === ActionType[ActionType.TIMER];

const isMqttAction = (actionDef: ActionDefinition): boolean =>
    actionDef && actionDef.type === ActionType[ActionType.MQTT];

const isMqttPublishAction = (actionDef: ActionDefinition): boolean =>
    actionDef && actionDef.type === ActionType[ActionType.MQTT_PUBLISH];

/* TODO */
export const loadAllActions = (actionDir: string, envConfig: any): Action[] => {
    const loadedActions: Action[] = [];

    readdirSync(actionDir).forEach(file => {
        const actionDef = loadYamlConfiguration(`${actionDir}/${file}`);

        if (!isValidActionDefinition(actionDef)) {
            getLogger().error(
                `Invalid action definition: ${JSON.stringify(actionDef)}`,
            );
            return;
        }

        if (isRestActionDefinition(actionDef)) {
            const host = getURL(actionDef, envConfig);
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
                new TimerAction(nameFromYamlConfig(file), undefined, actionDef),
            );
        } else if (isWebSocketActionDefinition(actionDef)) {
            const host = getURL(actionDef, envConfig);
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
                new MqttAction(nameFromYamlConfig(file), undefined, actionDef),
            );
        } else if (isMqttPublishAction(actionDef)) {
            loadedActions.push(
                new MqttPublishAction(
                    nameFromYamlConfig(file),
                    undefined,
                    actionDef,
                ),
            );
        } else if (isValidAMQPListenActionDefinition(actionDef)) {
            loadedActions.push(
                new AMQPListenAction(
                    nameFromYamlConfig(file),
                    getURL(actionDef, envConfig),
                    actionDef,
                ),
            );
        } else {
            getLogger().error(
                `Action definition ${nameFromYamlConfig(file)} of type ${
                    actionDef.type
                } does not contain a valid action definition for that type.`,
            );
        }
    });

    return loadedActions;
};

/**
 * Extracts the URL from the action definition if present or otherwise from the
 * environment configuration. In case of REST actions, if the http protocol is
 * not specified explicitly, https is assumed. In case of WebSocket actions, if
 * the ws protocol is not specified explicitly, wss is assumed. In case of
 * AMQPListenActions if the amqp protocol is not specified explicitly, amqps is
 * assumed.
 * @param actionDef The action definition
 * @param envConfig The environment configuration
 */
const getURL = (
    actionDef:
        | AMQPListenActionDefinition
        | RestActionDefinition
        | WebSocketActionDefinition,
    envConfig: any,
): string => {
    if (actionDef.type === 'REST') {
        if (actionDef.service.startsWith('http')) {
            return actionDef.service;
        }
        if (envConfig[actionDef.service].startsWith('http')) {
            return envConfig[actionDef.service];
        }
        return `https://${envConfig[actionDef.service]}`;
    }
    if (actionDef.type === 'WEBSOCKET') {
        if (actionDef.service.startsWith('ws')) {
            return actionDef.service;
        }
        if (envConfig[actionDef.service].startsWith('ws')) {
            return envConfig[actionDef.service];
        }
        return `wss://${envConfig[actionDef.service]}`;
    }
    if (actionDef.type === 'AMQP_LISTEN') {
        if (actionDef.broker.startsWith('amqp')) {
            return actionDef.broker;
        }
        if (envConfig[actionDef.broker].startsWith('amqp')) {
            return envConfig[actionDef.broker];
        }
        return `amqps://${envConfig[actionDef.broker]}`;
    }
    throw new Error(
        `Cannot get URL for action type ${
            (actionDef as ActionDefinition).type
        }`,
    );
};
