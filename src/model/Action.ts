import { Scenario } from './Scenario';
import { ActionType } from './ActionType';
import { ActionCallback } from './ActionCallback';

export interface Action {
    name: string;
    description: string;
    type: ActionType;
    invoke(scenario: Scenario): ActionCallback;
    invokeEvenOnFail: boolean;
    allowFailure: boolean;
}
