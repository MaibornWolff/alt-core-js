import { ActionCallback } from './ActionCallback';
import { ActionType } from './ActionType';
import { Scenario } from './Scenario';

interface Action {

    name: string;
    type: ActionType;
    invoke(scenario: Scenario): ActionCallback
}

export { Action };
