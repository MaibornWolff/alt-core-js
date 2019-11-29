import { Scenario } from './Scenario';
import { ActionType, ActionTypeType } from './ActionType';
import { ActionCallback } from './ActionCallback';
import { isArrayOfStrings } from '../util';

export interface ActionDefinition {
    readonly description?: string;
    readonly type: ActionTypeType;
    readonly invokeEvenOnFail?: boolean;
    readonly allowFailure?: boolean;
    readonly diagramConfiguration?: {
        hiddenFields?: string[];
        hidePlaintext?: boolean;
    };
}

export function isValidActionDefinition(
    toBeValidated: unknown,
): toBeValidated is ActionDefinition {
    if (typeof toBeValidated !== 'object' || toBeValidated === null) {
        return false;
    }
    const actionDef = toBeValidated as ActionDefinition;
    return (
        ['string', 'undefined'].includes(typeof actionDef.description) &&
        actionDef.type in ActionType &&
        ['boolean', 'undefined'].includes(typeof actionDef.invokeEvenOnFail) &&
        ['boolean', 'undefined'].includes(typeof actionDef.allowFailure) &&
        (actionDef.diagramConfiguration === undefined ||
            (typeof actionDef.diagramConfiguration === 'object' &&
                actionDef.diagramConfiguration !== null &&
                ['boolean', 'undefined'].includes(
                    typeof actionDef.diagramConfiguration.hidePlaintext,
                ) &&
                (typeof actionDef.diagramConfiguration.hiddenFields ===
                    'undefined' ||
                    isArrayOfStrings(
                        actionDef.diagramConfiguration.hiddenFields,
                    ))))
    );
}

export interface Action {
    readonly name: string;
    readonly description: string;
    readonly type: ActionType;
    invoke(scenario: Scenario): ActionCallback;
    readonly invokeEvenOnFail: boolean;
    readonly allowFailure: boolean;
}
