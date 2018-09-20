"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var logging_1 = require("./logging");
var yamlParsing_1 = require("./yamlParsing");
var actionLoading_1 = require("./actionLoading");
var scenarioLoading_1 = require("./scenarioLoading");
var TestResult_1 = require("./model/TestResult");
var ActionType_1 = require("./model/ActionType");
var diagramDrawing_1 = require("./diagramDrawing");
var pad = require('pad');
var RESULTS = new Map();
var NUM_PARALLEL_RUNS = 10;
exports.runScenario = function (scenarioPath, actionDir, envConfigFile) {
    try {
        if (typeof scenarioPath === 'undefined' || scenarioPath === "") {
            logging_1.getLogger("unknown").error("Please provide correct path to the SCENARIO file!");
            process.exit(1);
        }
        if (typeof actionDir === 'undefined' || actionDir === "") {
            logging_1.getLogger("unknown").error("Please provide correct path to the ACTION files!");
            process.exit(1);
        }
        logging_1.getLogger("unknown").info("Starting scenario: " + scenarioPath.toUpperCase() + " (actions: " + actionDir + ", envConfig: " + envConfigFile + ")");
        var envConfig = envConfigFile ? yamlParsing_1.loadYamlConfiguration(envConfigFile) : {};
        var actions = actionLoading_1.loadAllActions(actionDir, envConfig);
        var scenarios = scenarioPath.endsWith('yaml') ? scenarioLoading_1.loadScenariosById(scenarioPath, actions) : scenarioLoading_1.loadAllScenarios(scenarioPath, actions);
        processScenarios(scenarios);
    }
    catch (e) {
        logging_1.getLogger("unknown").error(e);
    }
};
function processScenarios(scenarios) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!(scenarios.length > 0)) return [3 /*break*/, 2];
                    return [4 /*yield*/, Promise.all(scenarios.splice(0, NUM_PARALLEL_RUNS).map(invokeActionsSynchronously))];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 0];
                case 2:
                    printResults();
                    stopProcessIfUnsuccessfulResults();
                    return [2 /*return*/];
            }
        });
    });
}
function invokeActionsSynchronously(scenario) {
    return __awaiter(this, void 0, void 0, function () {
        var scenarioName, ctx, MSG_WIDTH, timeDiffInMs, successful, ASYNC_ACTIONS, _loop_1, _i, _a, action, state_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    scenarioName = scenario.name;
                    RESULTS.set(scenarioName, []);
                    ctx = { scenario: scenarioName };
                    MSG_WIDTH = 100;
                    logging_1.getLogger(scenarioName).debug(pad(MSG_WIDTH, '#', '#'), ctx);
                    logging_1.getLogger(scenarioName).debug(pad("#### (S): " + scenarioName + ": " + scenario.description + " ", MSG_WIDTH, '#'), ctx);
                    logging_1.getLogger(scenarioName).debug(pad(MSG_WIDTH, '#', '#'), ctx);
                    diagramDrawing_1.initDiagramCreation(scenarioName);
                    timeDiffInMs = function (stop) {
                        return (stop[0] * 1e9 + stop[1]) * 1e-6;
                    };
                    successful = true;
                    ASYNC_ACTIONS = [];
                    _loop_1 = function (action) {
                        var start, actionCallback;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    Object.assign(ctx, { action: action.name });
                                    logging_1.getLogger(scenarioName).info(pad("#### (A): " + action.name + " ", MSG_WIDTH, '#'), ctx);
                                    start = process.hrtime();
                                    actionCallback = action.invoke(scenario);
                                    if (action.type == ActionType_1.ActionType.WEBSOCKET) {
                                        ASYNC_ACTIONS.push(actionCallback);
                                    }
                                    return [4 /*yield*/, actionCallback.promise
                                            .then(function (result) {
                                            var duration = timeDiffInMs(process.hrtime(start)).toFixed(2);
                                            var scenarioResults = RESULTS.get(scenarioName);
                                            if (scenarioResults)
                                                scenarioResults.push(new TestResult_1.TestResult(action.name, duration, true));
                                            if (result)
                                                logging_1.getLogger(scenario.name).debug(JSON.stringify(result), ctx);
                                            logging_1.getLogger(scenario.name).info(pad(MSG_WIDTH, " Time: " + duration + " ms ###########", '#'), ctx);
                                        })
                                            .catch(function (reason) {
                                            var duration = timeDiffInMs(process.hrtime(start)).toFixed(2);
                                            var scenarioResults = RESULTS.get(scenarioName);
                                            if (scenarioResults)
                                                scenarioResults.push(new TestResult_1.TestResult(action.name, duration, false));
                                            if (reason)
                                                logging_1.getLogger(scenario.name).error(JSON.stringify(reason), ctx);
                                            logging_1.getLogger(scenario.name).info(pad(MSG_WIDTH, " Time: " + duration + " ms ###########", '#'), ctx);
                                            // process.exit(1);
                                            successful = false;
                                        })];
                                case 1:
                                    _a.sent();
                                    if (!successful)
                                        return [2 /*return*/, "break"];
                                    return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, _a = scenario.actions;
                    _b.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 4];
                    action = _a[_i];
                    return [5 /*yield**/, _loop_1(action)];
                case 2:
                    state_1 = _b.sent();
                    if (state_1 === "break")
                        return [3 /*break*/, 4];
                    _b.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4:
                    // stop all async running actions
                    ASYNC_ACTIONS.forEach(function (callback) {
                        callback.cancel();
                    });
                    return [2 /*return*/];
            }
        });
    });
}
function printResults() {
    RESULTS.forEach(function (result, scenario) {
        var ctx = { scenario: scenario };
        var MSG_WIDTH = 60;
        logging_1.getLogger(scenario).info(pad("#### SUMMARY: " + scenario + " ", MSG_WIDTH, '#'), ctx);
        result.forEach(function (res) {
            if (res.successful)
                logging_1.getLogger(scenario).info(" OK: " + pad(res.action, 30) + " " + res.duration + " ms", ctx);
            else
                logging_1.getLogger(scenario).info("NOK: " + pad(res.action, 30) + " " + res.duration + " ms", ctx);
        });
        logging_1.getLogger(scenario).info(pad(MSG_WIDTH, '#', '#'), ctx);
    });
}
function stopProcessIfUnsuccessfulResults() {
    return __awaiter(this, void 0, void 0, function () {
        var anyError, diagrams;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    anyError = false;
                    diagrams = [];
                    RESULTS.forEach(function (res, scenario) {
                        diagrams.push(diagramDrawing_1.generateSequenceDiagram(scenario));
                        if (res.some(function (t) { return t.successful === false; })) {
                            anyError = true;
                        }
                    });
                    return [4 /*yield*/, Promise.all(diagrams)];
                case 1:
                    _a.sent();
                    if (anyError)
                        process.exit(1);
                    return [2 /*return*/];
            }
        });
    });
}
