import { ActionDefinition, Action } from './Action';
import { ActionCallback } from './ActionCallback';
import { ActionType } from './ActionType';
import { Scenario } from './Scenario';
import { injectVariableAccessAndEvaluate } from '../variableInjection';

export interface NodeJSActionDefinition extends ActionDefinition {
    variables?: { [key: string]: string };
    data?: { [key: string]: string };
}

export function isValidNodeJSActionDefinition(
    actionDef: ActionDefinition,
): actionDef is NodeJSActionDefinition {
    if (actionDef.type !== 'NODE_JS') {
        return false;
    }
    const nodeJSActionDef = actionDef as Partial<NodeJSActionDefinition>;

    if (typeof nodeJSActionDef.variables === 'undefined') {
        return true;
    }

    if (
        nodeJSActionDef.variables === null ||
        typeof nodeJSActionDef.variables !== 'object'
    ) {
        return false;
    }
    return (
        Object.entries(nodeJSActionDef.variables).find(
            ([variable, expression]) =>
                typeof expression !== 'string' || typeof variable !== 'string',
        ) === undefined
    );
}

export class NodeJSAction implements Action {
    readonly name: string;

    readonly description: string;

    readonly type = ActionType.NODE_JS;

    readonly invokeEvenOnFail: boolean;

    readonly allowFailure: boolean;

    private readonly variables: { [key: string]: string };

    private readonly data: { [key: string]: string };

    public constructor(
        name: string,
        {
            description = name,
            invokeEvenOnFail = false,
            allowFailure = false,
            variables,
            data,
        }: NodeJSActionDefinition,
    ) {
        this.name = name;
        this.description = description;
        this.invokeEvenOnFail = invokeEvenOnFail;
        this.allowFailure = allowFailure;
        this.variables = variables || {};
        this.data = data || {};
    }

    public static fromTemplate(
        nodeJSDefinition: Partial<NodeJSActionDefinition>,
        template: NodeJSAction,
    ): NodeJSAction {
        return new NodeJSAction(template.name, {
            description: nodeJSDefinition.description || template.description,
            type: 'NODE_JS',
            invokeEvenOnFail:
                nodeJSDefinition.invokeEvenOnFail != null
                    ? nodeJSDefinition.invokeEvenOnFail
                    : template.invokeEvenOnFail,
            allowFailure:
                nodeJSDefinition.allowFailure != null
                    ? nodeJSDefinition.allowFailure
                    : template.allowFailure,
            variables: nodeJSDefinition.variables || template.variables,
            data: nodeJSDefinition.data || template.data,
        });
    }

    invoke(scenario: Scenario): ActionCallback {
        const scenarioVariables = scenario.cache;
        Object.entries(this.data).forEach(([key, value]) => {
            scenarioVariables.set(key, value);
        });

        return {
            cancel: () => {},
            promise: new Promise(resolve => {
                Object.entries(this.variables).forEach(
                    ([variable, expression]) => {
                        scenarioVariables.set(
                            variable,
                            injectVariableAccessAndEvaluate(
                                expression,
                                scenarioVariables,
                            ),
                        );
                    },
                );
                resolve();
            }),
        };
    }
}
