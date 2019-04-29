// /<reference path="model/Scenario.ts"/>
import { readdirSync } from 'fs';
import { stringify } from 'querystring';
import { getLogger } from './logging';
import { Action } from './model/Action';
import { Scenario } from './model/Scenario';
import { loadYamlConfiguration, nameFromYamlConfig } from './yamlParsing';

export const loadScenariosById = (
    path: string,
    actionCatalog: Action[],
): Scenario[] => {
    const resultList: Scenario[] = [];
    const scenarioName = path
        .split('/')
        .pop()
        .replace('.yaml', '');

    loadAllScenarios(path.substring(0, path.lastIndexOf('/')), actionCatalog)
        .filter(s => s.name.startsWith(scenarioName))
        .forEach(s => resultList.push(s));

    if (resultList.length > 0) {
        return resultList;
    }
    getLogger('unknown').error(
        `Scenario '${scenarioName}' not found in the directory!`,
    );
    process.exit(1);
};

export const loadAllScenarios = (
    path: string,
    actionCatalog: Action[],
): Scenario[] => {
    const loadedScenarios: Scenario[] = [];

    readdirSync(`${path}`).forEach((file: any) => {
        const scenarioDef = loadYamlConfiguration(`${path}/${file}`);
        if (scenarioDef) {
            // split into multiple scenario instances
            if (scenarioDef.loadFactor) {
                for (let _i = 0; _i < scenarioDef.loadFactor; _i++) {
                    const scenarioNameWithIdx = `${nameFromYamlConfig(
                        file,
                    )}-${_i}`;
                    const ctx = { scenario: scenarioNameWithIdx };

                    const actionCatalogWithReplacedLoadVariables: Action[] = JSON.parse(
                        JSON.stringify(actionCatalog),
                    );
                    /*
                    Object.assign(
                        actionCatalogWithReplacedLoadVariables,
                        actionCatalog,
                    );
                    */

                    // inject loadVariables[_i] into the action definitions
                    if (scenarioDef.loadVariables) {
                        const currentLoadVariables = getLoadVariableTreeForLoadIdx(
                            scenarioDef.loadVariables,
                            _i,
                        );
                        for (const _current of Object.entries(
                            currentLoadVariables,
                        )) {
                            const currentLoad = _current[1];

                            const actionToBeReplaced: any = actionCatalogWithReplacedLoadVariables.find(
                                a => a.name === (currentLoad as any).name,
                            );
                            if (actionToBeReplaced) {
                                for (const key of Object.keys(currentLoad)) {
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
    const res = {};
    Object.assign(res, rootObject);

    for (const propEntry of Object.entries(rootObject)) {
        if (propEntry[0] == 'name') continue;

        if (Array.isArray(propEntry[1])) {
            const loadVars = propEntry[1] as string[];
            if (loadVars.length == 1 && loadVars[0].indexOf('...') >= 0) {
                const stringPrefix = loadVars[0].substr(
                    0,
                    loadVars[0].indexOf('$$'),
                );
                const numberRange = loadVars[0]
                    .replace('$$', '')
                    .substring(stringPrefix.length);
                const limits = numberRange.split('...');
                const minValue = Number.parseInt(limits[0]);
                const maxValue = Number.parseInt(limits[1]);
                const offset =
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
