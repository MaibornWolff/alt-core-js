import {Action} from "./Action";
import {getLogger} from "../logging";
import {RestAction} from "./RestAction";
import {ActionType} from "./ActionType";
import {TimerAction} from "./TimerAction";
import {WebSocketAction} from "./WebSocketAction";
import {MqttAction} from "./MqttAction";
import {MqttPublishAction} from "./MqttPublishAction";

class Scenario {
    /* retrieved from the file name */
    name: string;
    /* retrieved from the YAML definition */
    description: string;
    actions: Action[] = [];
    /* internal vars */
    cache: Map<string, string>;

    constructor(fileName: string, yamlConfig: any, actionConfig: Action[]) {
        this.name = fileName;

        this.description = yamlConfig.description;

        yamlConfig.actions.forEach((actionDef: any) => {
            let actionTemplate = actionConfig.find(c => c.name === actionDef.name);
            if (actionTemplate) {
                switch (actionTemplate.type) {
                    case ActionType.REST:
                        this.actions.push(RestAction.fromTemplate(actionDef, <RestAction>actionTemplate));
                        break;
                    case ActionType.TIMER:
                        this.actions.push(TimerAction.fromTemplate(actionDef, <TimerAction>actionTemplate));
                        break;
                    case ActionType.WEBSOCKET:
                        this.actions.push(WebSocketAction.fromTemplate(actionDef, <WebSocketAction>actionTemplate));
                        break;
                    case ActionType.MQTT:
                        this.actions.push(MqttAction.fromTemplate(actionDef, <MqttAction>actionTemplate));
                        break;
                    case ActionType.MQTT_PUBLISH:
                        this.actions.push(MqttPublishAction.fromTemplate(actionDef, <MqttPublishAction>actionTemplate));
                        break;
                }

            } else {
                getLogger(this.name).error("ERROR: Could not find any Action definition for: " + actionDef.name, { scenario: this.name });
            }
        });

        this.cache = new Map<string, string>([]);
    }
}

export { Scenario }
