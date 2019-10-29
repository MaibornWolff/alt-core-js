import { Action } from './Action';
import { getLogger } from '../logging';
import { RestAction } from './RestAction';
import { ActionType } from './ActionType';
import { TimerAction } from './TimerAction';
import { WebSocketAction } from './WebSocketAction';
import { MqttAction } from './MqttAction';
import { MqttPublishAction } from './MqttPublishAction';
import { AMQPListenAction } from './AMQPListenAction';
import { NodeJSAction } from './NodeJSAction';

class Scenario {
    /* retrieved from the file name */
    public name: string;

    /* retrieved from the YAML definition */
    public description: string;

    public actions: Action[] = [];

    /* internal vars */
    public cache: Map<string, unknown>;

    public constructor(
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
                            RestAction.fromTemplate(
                                actionDef,
                                actionTemplate as RestAction,
                            ),
                        );
                        break;
                    case ActionType.TIMER:
                        this.actions.push(
                            TimerAction.fromTemplate(
                                actionDef,
                                actionTemplate as TimerAction,
                            ),
                        );
                        break;
                    case ActionType.WEBSOCKET:
                        this.actions.push(
                            WebSocketAction.fromTemplate(
                                actionDef,
                                actionTemplate as WebSocketAction,
                            ),
                        );
                        break;
                    case ActionType.MQTT:
                        this.actions.push(
                            MqttAction.fromTemplate(
                                actionDef,
                                actionTemplate as MqttAction,
                            ),
                        );
                        break;
                    case ActionType.MQTT_PUBLISH:
                        this.actions.push(
                            MqttPublishAction.fromTemplate(
                                actionDef,
                                actionTemplate as MqttPublishAction,
                            ),
                        );
                        break;
                    case ActionType.AMQP_LISTEN:
                        this.actions.push(
                            AMQPListenAction.fromTemplate(
                                actionDef,
                                actionTemplate as AMQPListenAction,
                            ),
                        );
                        break;
                    case ActionType.NODE_JS:
                        this.actions.push(
                            NodeJSAction.fromTemplate(
                                actionDef,
                                actionTemplate as NodeJSAction,
                            ),
                        );
                        break;
                    default:
                        getLogger(this.name).error(
                            `Action template ${actionTemplate.name} is of unknown type ${actionTemplate.type}`,
                        );
                }
            } else {
                getLogger(this.name).error(
                    `Could not find any Action definition for: ${actionDef.name}`,
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

        this.cache = new Map<string, unknown>(
            yamlConfig.variables ? Object.entries(yamlConfig.variables) : [],
        );
    }
}

export { Scenario };
