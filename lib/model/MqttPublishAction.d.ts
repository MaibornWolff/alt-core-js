import { Action } from "./Action";
import { ActionType } from "./ActionType";
import { Scenario } from "./Scenario";
import { ActionCallback } from "./ActionCallback";
declare class MqttPublishAction implements Action {
    name: string;
    type: ActionType;
    url: string;
    username: string;
    password: string;
    topic: string;
    data: any;
    isByte: boolean;
    constructor(name: string, mqttDefinition: any, url?: any, username?: any, password?: any, topic?: any, data?: any, isByte?: any);
    static fromTemplate(mqttDefinition: any, template: MqttPublishAction): MqttPublishAction;
    invoke(scenario: Scenario): ActionCallback;
    invokeAsync(scenario: Scenario): void;
}
export { MqttPublishAction };
