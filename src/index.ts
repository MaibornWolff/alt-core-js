import { Scenario } from './model/Scenario';
import { getLogger } from './logging';
import { Action } from './model/Action';
import { loadYamlConfiguration } from './yamlParsing';
import { loadAllActions } from './actionLoading';
import { loadAllScenarios, loadScenariosById } from './scenarioLoading';
import { TestResult } from './model/TestResult';
import { ActionType } from './model/ActionType';
import { generateSequenceDiagram, initDiagramCreation } from './diagramDrawing';
import pad = require('pad');

const RESULTS: Map<string, TestResult[]> = new Map();

const NUM_PARALLEL_RUNS = 10;

let _OUT_DIR = '';

// increase the pixel-size (width/height) limit of PlantUML (the default is 4096 which is not enough for some diagrams)
process.env.PLANTUML_LIMIT_SIZE = '16384';

export const runScenario = (
    scenarioPath: string,
    actionDir: string,
    outDir = 'out',
    envConfigFile: string,
) => {
    try {
        if (typeof scenarioPath === 'undefined' || scenarioPath === '') {
            getLogger('unknown').error(
                'Please provide correct path to the SCENARIO file!',
            );
            process.exit(1);
        }
        if (typeof actionDir === 'undefined' || actionDir === '') {
            getLogger('unknown').error(
                'Please provide correct path to the ACTION files!',
            );
            process.exit(1);
        }
        getLogger('unknown').info(
            `Starting scenario: ${scenarioPath} (actions: ${actionDir}, out: ${outDir}, envConfig: ${envConfigFile})`,
        );

        _OUT_DIR = outDir;

        const envConfig = envConfigFile
            ? loadYamlConfiguration(envConfigFile)
            : {};

        const actions: Action[] = loadAllActions(actionDir, envConfig);

        const scenarios: Scenario[] = scenarioPath.endsWith('yaml')
            ? loadScenariosById(scenarioPath, actions)
            : loadAllScenarios(scenarioPath, actions);

        processScenarios(scenarios);
    } catch (e) {
        getLogger('unknown').error(e);
    }
};

async function processScenarios(scenarios: Scenario[]) {
    while (scenarios.length > 0) {
        await Promise.all(
            scenarios
                .splice(0, NUM_PARALLEL_RUNS)
                .map(invokeActionsSynchronously),
        );
    }
    printResults();
    stopProcessIfUnsuccessfulResults();
}

async function invokeActionsSynchronously(scenario: Scenario) {
    let scenarioName = scenario.name;
    RESULTS.set(scenarioName, []);

    let ctx = { scenario: scenarioName };
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

    let timeDiffInMs = function(stop: [number, number]) {
        return (stop[0] * 1e9 + stop[1]) * 1e-6;
    };

    let successful = true;
    let ASYNC_ACTIONS = [];

    for (let action of scenario.actions) {
        Object.assign(ctx, { action: action.name });

        getLogger(scenarioName).info(
            pad(`#### (A): ${action.name} `, MSG_WIDTH, '#'),
            ctx,
        );
        let start = process.hrtime();

        const actionCallback = action.invoke(scenario);
        if (action.type == ActionType.WEBSOCKET) {
            ASYNC_ACTIONS.push(actionCallback);
        }

        await actionCallback.promise
            .then(result => {
                let duration = timeDiffInMs(process.hrtime(start)).toFixed(2);

                let scenarioResults = RESULTS.get(scenarioName);
                if (scenarioResults)
                    scenarioResults.push(
                        new TestResult(action.name, duration, true),
                    );

                if (result)
                    getLogger(scenario.name).debug(JSON.stringify(result), ctx);
                getLogger(scenario.name).info(
                    pad(MSG_WIDTH, ` Time: ${duration} ms ###########`, '#'),
                    ctx,
                );
            })
            .catch(reason => {
                let duration = timeDiffInMs(process.hrtime(start)).toFixed(2);

                let scenarioResults = RESULTS.get(scenarioName);
                if (scenarioResults)
                    scenarioResults.push(
                        new TestResult(action.name, duration, false),
                    );

                if (reason)
                    getLogger(scenario.name).error(JSON.stringify(reason), ctx);
                getLogger(scenario.name).info(
                    pad(MSG_WIDTH, ` Time: ${duration} ms ###########`, '#'),
                    ctx,
                );

                // process.exit(1);
                successful = false;
            });

        if (!successful) break;
    }

    // stop all async running actions
    ASYNC_ACTIONS.forEach(callback => {
        callback.cancel();
    });
}

function printResults(): any {
    RESULTS.forEach((result, scenario) => {
        let ctx = { scenario: scenario };
        const MSG_WIDTH = 60;

        getLogger(scenario).info(
            pad(`#### SUMMARY: ${scenario} `, MSG_WIDTH, '#'),
            ctx,
        );

        result.forEach((res: TestResult) => {
            if (res.successful)
                getLogger(scenario).info(
                    ` OK: ${pad(res.action, 30)} ${res.duration} ms`,
                    ctx,
                );
            else
                getLogger(scenario).info(
                    `NOK: ${pad(res.action, 30)} ${res.duration} ms`,
                    ctx,
                );
        });

        getLogger(scenario).info(pad(MSG_WIDTH, '#', '#'), ctx);
    });
}

async function stopProcessIfUnsuccessfulResults() {
    let anyError = false;
    let diagrams = [];
    RESULTS.forEach((res, scenario) => {
        diagrams.push(generateSequenceDiagram(scenario));
        if (res.some(t => t.successful === false)) {
            anyError = true;
        }
    });
    await Promise.all(diagrams);
    if (anyError) process.exit(1);
}

export const OUTPUT_DIR = () => _OUT_DIR;
