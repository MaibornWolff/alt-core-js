import { ActionDefinition, Action } from './Action';
import { ActionType } from './ActionType';
import { Scenario } from './Scenario';
import { ActionCallback } from './ActionCallback';

export interface ProcessActionDefinition extends ActionDefinition {
    variables: { [key: string]: string };
}

export function isValidProcessActionDefinition(
    actionDef: ActionDefinition,
): actionDef is ProcessActionDefinition {
    if (actionDef.type !== 'PROCESS') {
        return false;
    }
    const processActionDef = actionDef as Partial<ProcessActionDefinition>;

    if (
        processActionDef.variables === null ||
        typeof processActionDef.variables !== 'object'
    ) {
        return false;
    }
    return (
        Object.entries(processActionDef.variables).find(
            ([variable, expression]) =>
                typeof expression !== 'string' || typeof variable !== 'string',
        ) === undefined
    );
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

    public static fromTemplate(
        processDefinition: Partial<ProcessActionDefinition>,
        template: ProcessAction,
    ): ProcessAction {
        return new ProcessAction(template.name, {
            description: processDefinition.description || template.description,
            type: 'PROCESS',
            invokeEvenOnFail:
                processDefinition.invokeEvenOnFail != null
                    ? processDefinition.invokeEvenOnFail
                    : template.invokeEvenOnFail,
            allowFailure:
                processDefinition.allowFailure != null
                    ? processDefinition.allowFailure
                    : template.allowFailure,
            variables: processDefinition.variables || template.variables,
        });
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
