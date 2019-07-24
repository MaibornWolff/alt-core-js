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
    return process.exit(1);
};

export const loadAllScenarios = (
    path: string,
    actionCatalog: Action[],
): Scenario[] => {
    const loadedScenarios: Scenario[] = [];

    readdirSync(`${path}`).forEach((file: any) => {
        const scenarioDef = loadYamlConfiguration(`${path}/${file}`);
        if (scenarioDef) {
            // get imports
            const scenarioImports: Scenario[] = [];
            if (scenarioDef.import) {
                const scenarioNamesToBeImported: string[] = scenarioDef.import;
                if (
                    scenarioNamesToBeImported.every(
                        i => loadedScenarios.findIndex(s => s.name === i) >= 0,
                    )
                ) {
                    loadedScenarios
                        .filter(s => scenarioNamesToBeImported.includes(s.name))
                        .forEach(s => scenarioImports.push(s));
                } else {
                    getLogger(nameFromYamlConfig(file)).error(
                        `One of the imports (${scenarioNamesToBeImported}) are missing or were not loaded prior to this one!`,
                    );
                }
            }
            // split into multiple scenario instances
            if (scenarioDef.loadFactor) {
                for (let i = 0; i < scenarioDef.loadFactor; i++) {
                    const scenarioNameWithIdx = `${nameFromYamlConfig(
                        file,
                    )}-${i}`;
                    const ctx = { scenario: scenarioNameWithIdx };

                    const actionCatalogWithReplacedLoadVariables: Action[] = JSON.parse(
                        JSON.stringify(actionCatalog),
                    );

                    // inject loadVariables[_i] into the action definitions
                    if (scenarioDef.loadVariables) {
                        const currentLoadVariables = getLoadVariableTreeForLoadIdx(
                            scenarioDef.loadVariables,
                            i,
                        );
                        for (const current of Object.entries(
                            currentLoadVariables,
                        )) {
                            const currentLoad = current[1];

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
                            scenarioImports,
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
                        scenarioImports,
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
        if (propEntry[0] === 'name') continue;

        if (Array.isArray(propEntry[1])) {
            if (typeof propEntry[1][0] === 'object') {
                // not a load-var-array but custom one
                const arr = [];
                arr.push(getLoadVariableTreeForLoadIdx(propEntry[1][0], idx));

                Object.defineProperty(res, propEntry[0], { value: arr });
            } else {
                const loadVars = propEntry[1] as string[];
                if (loadVars.length === 1 && loadVars[0].indexOf('...') >= 0) {
                    const stringPrefix = loadVars[0].substr(
                        0,
                        loadVars[0].indexOf('$$'),
                    );
                    const numberRange = loadVars[0]
                        .replace('$$', '')
                        .substring(stringPrefix.length);
                    const limits = numberRange.split('...');
                    const minValue = Number.parseInt(limits[0], 10);
                    const maxValue = Number.parseInt(limits[1], 10);
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
