///<reference path="model/Scenario.ts"/>
import { loadYamlConfiguration, nameFromYamlConfig } from './yamlParsing';
import { Scenario } from './model/Scenario';
import { Action } from './model/Action';
import { getLogger } from './logging';
import { stringify } from 'querystring';

const FS = require('fs');

export const loadScenariosById = (
    path: string,
    actionCatalog: Action[],
): Scenario[] => {
    let resultList: Scenario[] = [];
    let scenarioName = path
        .split('/')
        .pop()
        .replace('.yaml', '');

    loadAllScenarios(path.substring(0, path.lastIndexOf('/')), actionCatalog)
        .filter(s => s.name.startsWith(scenarioName))
        .forEach(s => resultList.push(s));

    if (resultList.length > 0) {
        return resultList;
    } else {
        getLogger('unknown').error(
            `Scenario '${scenarioName}' not found in the directory!`,
        );
        process.exit(1);
    }
};

export const loadAllScenarios = (
    path: string,
    actionCatalog: Action[],
): Scenario[] => {
    let loadedScenarios: Scenario[] = [];

    FS.readdirSync(`${path}`).forEach((file: any) => {
        let scenarioDef = loadYamlConfiguration(`${path}/${file}`);
        if (scenarioDef) {
            // split into multiple scenario instances
            if (scenarioDef.loadFactor) {
                for (let _i = 0; _i < scenarioDef.loadFactor; _i++) {
                    let scenarioNameWithIdx =
                        nameFromYamlConfig(file) + '-' + _i;
                    let ctx = { scenario: scenarioNameWithIdx };

                    let actionCatalogWithReplacedLoadVariables: Action[] = [];
                    Object.assign(
                        actionCatalogWithReplacedLoadVariables,
                        actionCatalog,
                    );

                    // inject loadVariables[_i] into the action definitions
                    if (scenarioDef.loadVariables) {
                        let currentLoadVariables = getLoadVariableTreeForLoadIdx(
                            scenarioDef.loadVariables,
                            _i,
                        );
                        for (let _current of Object.entries(
                            currentLoadVariables,
                        )) {
                            let currentLoad = _current[1];

                            let actionToBeReplaced: any = actionCatalogWithReplacedLoadVariables.find(
                                a => a.name === (currentLoad as any).name,
                            );
                            if (actionToBeReplaced) {
                                for (let key of Object.keys(currentLoad)) {
                                    if (key !== 'name') {
                                        if (
                                            actionToBeReplaced[key] &&
                                            typeof actionToBeReplaced[key] ===
                                                'object'
                                        ) {
                                            getLogger(
                                                scenarioNameWithIdx,
                                            ).debug(
                                                `Replacing "${stringify(
                                                    actionToBeReplaced[key],
                                                )}" with "${stringify(
                                                    currentLoad[key],
                                                )}" for key "${key}"`,
                                                Object.assign(ctx, {
                                                    action:
                                                        actionToBeReplaced.name,
                                                }),
                                            );
                                            Object.assign(
                                                actionToBeReplaced[key],
                                                currentLoad[key],
                                            );
                                        } else if (actionToBeReplaced[key]) {
                                            getLogger(
                                                scenarioNameWithIdx,
                                            ).debug(
                                                `Replacing "${
                                                    actionToBeReplaced[key]
                                                }" with "${
                                                    currentLoad[key]
                                                }" for key "${key}"`,
                                                Object.assign(ctx, {
                                                    action:
                                                        actionToBeReplaced.name,
                                                }),
                                            );
                                            actionToBeReplaced[key] =
                                                currentLoad[key];
                                        }
                                    }
                                }
                            }
                        }
                    }

                    loadedScenarios.push(
                        new Scenario(
                            scenarioNameWithIdx,
                            scenarioDef,
                            actionCatalogWithReplacedLoadVariables,
                        ),
                    );
                }
            } else {
                // just one instance of the scenario
                loadedScenarios.push(
                    new Scenario(
                        nameFromYamlConfig(file),
                        scenarioDef,
                        actionCatalog,
                    ),
                );
            }
        }
    });

    return loadedScenarios;
};

function getLoadVariableTreeForLoadIdx(rootObject: any, idx: number): any {
    let res = {};
    Object.assign(res, rootObject);

    for (let propEntry of Object.entries(rootObject)) {
        if (propEntry[0] == 'name') continue;

        if (Array.isArray(propEntry[1])) {
            let loadVars = propEntry[1] as string[];
            if (loadVars.length == 1 && loadVars[0].indexOf('...') >= 0) {
                let stringPrefix = loadVars[0].substr(
                    0,
                    loadVars[0].indexOf('$$'),
                );
                let numberRange = loadVars[0]
                    .replace('$$', '')
                    .substring(stringPrefix.length);
                let limits = numberRange.split('...');
                let minValue = Number.parseInt(limits[0]);
                let maxValue = Number.parseInt(limits[1]);
                let offset =
                    minValue + idx <= maxValue
                        ? idx
                        : minValue + idx - maxValue;
                // console.log(`${stringPrefix} | ${numberRange} | ${minValue} | ${maxValue} | ${offset}`);
                Object.defineProperty(res, propEntry[0], {
                    value: `${stringPrefix}${minValue + offset}`,
                });
            } else {
                Object.defineProperty(res, propEntry[0], {
                    value: loadVars[idx % loadVars.length],
                });
            }
        } else {
            Object.defineProperty(res, propEntry[0], {
                value: getLoadVariableTreeForLoadIdx(
                    rootObject[propEntry[0]],
                    idx,
                ),
            });
        }
    }
    return res;
}
