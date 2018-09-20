import { Scenario } from "./Scenario";
import { ActionType } from "./ActionType";
import { ActionCallback } from "./ActionCallback";
interface Action {
    name: string;
    type: ActionType;
    invoke(scenario: Scenario): ActionCallback;
}
export { Action };
