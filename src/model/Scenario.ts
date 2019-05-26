import { Action } from './Action';
import { getLogger } from '../logging';
import { RestAction } from './RestAction';
import { ActionType } from './ActionType';
import { TimerAction } from './TimerAction';
import { WebSocketAction } from './WebSocketAction';
import { MqttAction } from './MqttAction';
import { MqttPublishAction } from './MqttPublishAction';

class Scenario {
    /* retrieved from the file name */
    name: string;

    /* retrieved from the YAML definition */
    description: string;

    actions: Action[] = [];

    /* internal vars */
    cache: Map<string, any>;

    constructor(
        fileName: string,
        yamlConfig: any,
        actionConfig: Action[],
        imports: Scenario[],
    ) {
        this.name = fileName;

        this.description = yamlConfig.description;

        // before
        if (yamlConfig.before) {
            imports
                .filter(i => i.name === yamlConfig.before)
                .forEach(s => s.actions.forEach(a => this.actions.push(a)));
        }

        // main
        yamlConfig.actions.forEach((actionDef: any) => {
            const actionTemplate = actionConfig.find(
                c => c.name === actionDef.name,
            );
            if (actionTemplate) {
                switch (actionTemplate.type) {
                    case ActionType.REST:
                        this.actions.push(
                            RestAction.fromTemplate(actionDef, <RestAction>(
                                actionTemplate
                            )),
                        );
                        break;
                    case ActionType.TIMER:
                        this.actions.push(
                            TimerAction.fromTemplate(actionDef, <TimerAction>(
                                actionTemplate
                            )),
                        );
                        break;
                    case ActionType.WEBSOCKET:
                        this.actions.push(
                            WebSocketAction.fromTemplate(actionDef, <
                                WebSocketAction
                            >actionTemplate),
                        );
                        break;
                    case ActionType.MQTT:
                        this.actions.push(
                            MqttAction.fromTemplate(actionDef, <MqttAction>(
                                actionTemplate
                            )),
                        );
                        break;
                    case ActionType.MQTT_PUBLISH:
                        this.actions.push(
                            MqttPublishAction.fromTemplate(actionDef, <
                                MqttPublishAction
                            >actionTemplate),
                        );
                        break;
                }
            } else {
                getLogger(this.name).error(
                    `ERROR: Could not find any Action definition for: ${
                        actionDef.name
                    }`,
                    { scenario: this.name },
                );
            }
        });

        // after
        if (yamlConfig.after) {
            imports
                .filter(i => i.name === yamlConfig.after)
                .forEach(s => s.actions.forEach(a => this.actions.push(a)));
        }

        this.cache = new Map<string, any>(
            yamlConfig.variables ? Object.entries(yamlConfig.variables) : [],
        );
    }
}

export { Scenario };
