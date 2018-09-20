/// <reference path="model/Scenario.d.ts" />
import { Scenario } from "./model/Scenario";
import { Action } from "./model/Action";
export declare const loadScenariosById: (path: string, actionCatalog: Action[]) => Scenario[];
export declare const loadAllScenarios: (path: string, actionCatalog: Action[]) => Scenario[];
