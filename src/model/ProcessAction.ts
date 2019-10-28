import { ActionDefinition, Action } from './Action';
import { ActionType } from './ActionType';
import { Scenario } from './Scenario';
import { ActionCallback } from './ActionCallback';

export interface ProcessActionDefinition extends ActionDefinition {
    variables: { [key: string]: string };
}

export class ProcessAction implements Action {
    readonly name: string;

    readonly description: string;

    readonly type: ActionType.PROCESS;

    readonly invokeEvenOnFail: boolean;

    readonly allowFailure: boolean;

    readonly variables: { [key: string]: string };

    public constructor(
        name: string,
        {
            description = name,
            invokeEvenOnFail = false,
            allowFailure = false,
            variables,
        }: ProcessActionDefinition,
    ) {
        this.name = name;
        this.description = description;
        this.invokeEvenOnFail = invokeEvenOnFail;
        this.allowFailure = allowFailure;
        this.variables = variables;
    }

    invoke(scenario: Scenario): ActionCallback {
        const scenarioVariables = scenario.cache;

        return {
            cancel: () => {},
            promise: new Promise(resolve => {
                Object.entries(this.variables).forEach(
                    ([variable, expression]) => {
                        scenarioVariables.set(variable, eval(expression));
                    },
                );
                resolve();
            }),
        };
    }
}
