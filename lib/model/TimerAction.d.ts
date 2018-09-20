import { Action } from "./Action";
import { Scenario } from "./Scenario";
import { ActionType } from "./ActionType";
import { ActionCallback } from "./ActionCallback";
declare class TimerAction implements Action {
    name: string;
    type: ActionType;
    duration: number;
    constructor(name: string, timerDefinition: any, duration?: any);
    static fromTemplate(timerDefinition: any, template: TimerAction): TimerAction;
    invoke(scenario: Scenario): ActionCallback;
}
export { TimerAction };
