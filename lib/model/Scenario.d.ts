import { Action } from "./Action";
declare class Scenario {
    name: string;
    description: string;
    actions: Action[];
    cache: Map<string, any>;
    constructor(fileName: string, yamlConfig: any, actionConfig: Action[]);
}
export { Scenario };
