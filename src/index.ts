import * as pad from 'pad';
import { stringify } from 'querystring';
import { loadAllActions } from './actionLoading';
import {
    generateSequenceDiagram,
    initDiagramCreation,
} from './diagramDrawing/diagramDrawing';
import { getLogger } from './logging';
import { Action } from './model/Action';
import { ActionType } from './model/ActionType';
import { Scenario } from './model/Scenario';
import { TestResult } from './model/TestResult';
import { loadAllScenarios, loadScenariosById } from './scenarioLoading';
import { loadYamlConfiguration } from './yamlParsing';
import { ActionCallback } from './model/ActionCallback';

const RESULTS: Map<string, TestResult[]> = new Map();

let OUT_DIR = '';

// increase the pixel-size (width/height) limit of PlantUML (the default is 4096 which is not enough for some diagrams)
process.env.PLANTUML_LIMIT_SIZE = '16384';

interface RunConfiguration {
    numberOfScenariosRunInParallel?: number;
    environmentNameToBeUsed?: string;
    drawDiagrams?: boolean;
}

/**
 * @deprecated since 1.8.0, use {@link runMultipleScenariosWithConfig} instead
 */
export const runMultipleSceanriosWithConfig = (
    actionDir: string,
    outDir = 'out',
    envConfigDir: string,
    runConfig: RunConfiguration,
    scenarioPaths: string[],
): void =>
    runMultipleScenariosWithConfig(
        actionDir,
        outDir,
        envConfigDir,
        runConfig,
        scenarioPaths,
    );

export const runMultipleScenariosWithConfig = (
    actionDir: string,
    outDir = 'out',
    envConfigDir: string,
    runConfig: RunConfiguration,
    scenarioPaths: string[],
): void => {
    runMultipleScenariosWithConfigAsync(
        actionDir,
        outDir,
        envConfigDir,
        runConfig,
        scenarioPaths,
    ).then(result => {
        if (!result) process.exit(1);
    });
};

export const runMultipleScenariosWithConfigAsync = async (
    actionDir: string,
    outDir = 'out',
    envConfigDir: string,
    runConfig: RunConfiguration,
    scenarioPaths: string[],
): Promise<boolean> => {
    // TODO: global variables should be avoided
    RESULTS.clear();
    const {
        numberOfScenariosRunInParallel = 10,
        environmentNameToBeUsed = 'none',
        drawDiagrams = true,
    } = runConfig;

    try {
        if (
            typeof scenarioPaths === 'undefined' ||
            scenarioPaths.length === 0
        ) {
            getLogger().error(
                'Please provide correct path(s) to the SCENARIO file!',
            );
            process.exit(1);
        }
        if (typeof actionDir === 'undefined' || actionDir === '') {
            getLogger().error(
                'Please provide correct path to the ACTION files!',
            );
            process.exit(1);
        }

        getLogger('setup').info(
            `RUNNING: scenario(s): ${scenarioPaths} (actions: ${actionDir}, out: ${outDir}, envDir: ${envConfigDir}, numberOfScenariosRunInParallel: ${numberOfScenariosRunInParallel}, environmentNameToBeUsed: ${environmentNameToBeUsed})`,
        );

        OUT_DIR = outDir;

        const envConfig = envConfigDir
            ? loadYamlConfiguration(
                  `${envConfigDir}/${environmentNameToBeUsed}.yaml`,
              )
            : {};
        getLogger('setup').debug(
            `Using '${environmentNameToBeUsed}' configuration: ${stringify(
                envConfig,
            )}`,
        );

        const actions: Action[] = loadAllActions(actionDir, envConfig);
        getLogger('setup').debug(
            `Successfully loaded ${actions.length} actions`,
        );

        const resultPromises: Promise<boolean>[] = [];
        scenarioPaths.forEach(scenarioPath => {
            getLogger('setup').debug(`Loading: ${scenarioPath} ...`);
            const scenarios: Scenario[] = scenarioPath.endsWith('yaml')
                ? loadScenariosById(scenarioPath, actions)
                : loadAllScenarios(scenarioPath, actions);
            getLogger('setup').debug(
                `Successfully loaded ${scenarios.length} scenario(s): ${scenarioPath}`,
            );

            resultPromises.push(
                processScenarios(
                    scenarios,
                    numberOfScenariosRunInParallel,
                    drawDiagrams,
                ),
            );
        });

        const results = await Promise.all(resultPromises);
        return results.every(result => result);
    } catch (e) {
        getLogger('setup').error(e);
        return false;
    }
};

/**
 * @deprecated since 1.5.0, use {@link runMultipleSceanriosWithConfig} or
 * {@link runMultipleSceanriosWithConfigAsync} instead
 */
export const runScenario = (
    scenarioPath: string,
    actionDir: string,
    outDir = 'out',
    envConfigFile: string,
): void => {
    runMultipleSceanriosWithConfig(
        actionDir,
        outDir,
        envConfigFile.substring(
            0,
            envConfigFile.length - 12,
        ) /* substracting '/config.yaml' from the string */,
        { environmentNameToBeUsed: 'config' },
        [scenarioPath],
    );
};

async function processScenarios(
    scenarios: Scenario[],
    numberOfScenariosRunInParallel: number,
    drawDiagrams: boolean,
): Promise<boolean> {
    for (let i = 0; i < scenarios.length; i += numberOfScenariosRunInParallel) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.all(
            scenarios
                .slice(i, i + numberOfScenariosRunInParallel)
                .map(invokeActionsSynchronously),
        );
    }
    printResults();
    return generateDiagramsAndDetermineSuccess(drawDiagrams);
}

async function invokeActionsSynchronously(scenario: Scenario): Promise<void> {
    const scenarioName = scenario.name;
    RESULTS.set(scenarioName, []);

    const ctx = { scenario: scenarioName };
    const MSG_WIDTH = 100;

    getLogger(scenarioName).debug(pad(MSG_WIDTH, '#', '#'), ctx);
    getLogger(scenarioName).debug(
        pad(
            `#### (S): ${scenarioName}: ${scenario.description} `,
            MSG_WIDTH,
            '#',
        ),
        ctx,
    );
    getLogger(scenarioName).debug(pad(MSG_WIDTH, '#', '#'), ctx);
    initDiagramCreation(scenarioName);

    const timeDiffInMs = (stop: [number, number]): number =>
        (stop[0] * 1e9 + stop[1]) * 1e-6;

    let successful = true;
    const actionsToCancel: ActionCallback[] = [];
    const actionsToAwaitAtEnd: Promise<unknown>[] = [];

    const handleError = (
        reason: unknown,
        action: Action,
        start: [number, number],
        context: { scenario: string; action: string },
    ): void => {
        const duration = timeDiffInMs(process.hrtime(start)).toFixed(2);

        const scenarioResults = RESULTS.get(scenarioName);
        if (scenarioResults)
            scenarioResults.push(
                new TestResult(
                    action.description,
                    duration,
                    false,
                    action.allowFailure,
                ),
            );

        if (reason)
            getLogger(scenario.name).error(
                reason instanceof Error
                    ? reason.toString()
                    : JSON.stringify(reason),
                context,
            );
        getLogger(scenario.name).info(
            pad(MSG_WIDTH, ` Time: ${duration} ms ###########`, '#'),
            context,
        );

        if (action.allowFailure !== true) {
            successful = false;
        }
    };

    for (const action of scenario.actions) {
        if (!successful) {
            // after first ERROR skip further actions unless 'Action#invokeEvenOnFail' is set to TRUE
            if (!action.invokeEvenOnFail) continue;
        }

        const context = { ...ctx, action: action.name };

        getLogger(scenarioName).info(
            pad(`#### (A): ${action.description} `, MSG_WIDTH, '#'),
            context,
        );
        const start = process.hrtime();

        const actionCallback = action.invoke(scenario);
        const actionPromise = actionCallback.promise
            .then(result => {
                const duration = timeDiffInMs(process.hrtime(start)).toFixed(2);

                const scenarioResults = RESULTS.get(scenarioName);
                if (scenarioResults)
                    scenarioResults.push(
                        new TestResult(
                            action.description,
                            duration,
                            true,
                            action.allowFailure,
                        ),
                    );

                if (result)
                    getLogger(scenario.name).debug(
                        JSON.stringify(result),
                        context,
                    );
                getLogger(scenario.name).info(
                    pad(MSG_WIDTH, ` Time: ${duration} ms ###########`, '#'),
                    context,
                );
            })
            .catch(reason => handleError(reason, action, start, context));

        if (
            action.type === ActionType.WEBSOCKET ||
            action.type === ActionType.AMQP_LISTEN
        ) {
            actionsToCancel.push(actionCallback);
        }
        if (
            action.type === ActionType.MQTT ||
            action.type === ActionType.WEBSOCKET ||
            action.type === ActionType.AMQP_LISTEN
        ) {
            actionsToAwaitAtEnd.push(actionPromise);
        } else {
            await actionPromise; // eslint-disable-line no-await-in-loop
        }
    }

    // stop all async running actions
    actionsToCancel.forEach(callback => callback.cancel());
    await Promise.all(actionsToAwaitAtEnd);
}

function printResults(): void {
    RESULTS.forEach((result, scenario) => {
        const ctx = { scenario };
        const MSG_WIDTH = 100;

        getLogger(scenario).info(
            pad(`#### SUMMARY: ${scenario} `, MSG_WIDTH, '#'),
            ctx,
        );

        result.forEach((res: TestResult) => {
            if (res.successful === true) {
                getLogger(scenario).info(
                    ` OK: ${pad(res.action, 50)} ${res.duration} ms`,
                    ctx,
                );
            } else if (res.allowFailure === true) {
                getLogger(scenario).info(
                    `IGN: ${pad(res.action, 50)} ${res.duration} ms`,
                    ctx,
                );
            } else {
                getLogger(scenario).info(
                    `NOK: ${pad(res.action, 50)} ${res.duration} ms`,
                    ctx,
                );
            }
        });

        getLogger(scenario).info(pad(MSG_WIDTH, '#', '#'), ctx);
    });
}

async function generateDiagramsAndDetermineSuccess(
    drawDiagrams: boolean,
): Promise<boolean> {
    let anyError = false;
    const diagrams: Promise<void>[] = [];
    RESULTS.forEach((results, scenario) => {
        if (drawDiagrams) {
            diagrams.push(generateSequenceDiagram(scenario));
        }
        anyError =
            anyError || results.some(result => result.isConsideredFailure());
    });
    await Promise.all(diagrams);
    return !anyError;
}

export const OUTPUT_DIR = (): string => OUT_DIR;
