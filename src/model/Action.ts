import { Scenario } from './Scenario';
import { ActionType } from './ActionType';
import { ActionCallback } from './ActionCallback';

interface Action {
    name: string;
    description: string;
    type: ActionType;
    invoke(scenario: Scenario): ActionCallback;
}

export { Action };
