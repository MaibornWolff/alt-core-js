import { Action } from "./Action";
import { Scenario } from "./Scenario";
import { ActionType } from "./ActionType";
import { ActionCallback } from "./ActionCallback";
declare class RestAction implements Action {
    serviceName: string;
    name: string;
    type: ActionType;
    url: string;
    method: string;
    restHead: any;
    data: Map<string, string>;
    dataBinary: string;
    form: any;
    responseValidation: string[];
    variables: Map<string, string>;
    constructor(name: string, actionDef: any, url: string, serviceName: string, restMethod?: any, restHeaders?: any, restData?: any, restDataBinary?: any, restForm?: any, validators?: any, vars?: any);
    static fromTemplate(actionDef: any, template: RestAction): RestAction;
    private static loadData;
    invoke(scenario: Scenario): ActionCallback;
}
export { RestAction };
