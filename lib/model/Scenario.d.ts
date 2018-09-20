import { Action } from "./Action";
declare class Scenario {
    name: string;
    description: string;
    actions: Action[];
    cache: Map<string, string>;
    constructor(fileName: string, yamlConfig: any, actionConfig: Action[]);
}
export { Scenario };
