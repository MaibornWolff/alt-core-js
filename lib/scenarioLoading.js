"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
///<reference path="model/Scenario.ts"/>
var yamlParsing_1 = require("./yamlParsing");
var Scenario_1 = require("./model/Scenario");
var logging_1 = require("./logging");
var querystring_1 = require("querystring");
var FS = require('fs');
exports.loadScenariosById = function (path, actionCatalog) {
    var resultList = [];
    var scenarioName = path.split('/').pop().replace('.yaml', '');
    exports.loadAllScenarios(path.substring(0, path.lastIndexOf('/')), actionCatalog)
        .filter(function (s) { return s.name.startsWith(scenarioName); })
        .forEach(function (s) { return resultList.push(s); });
    if (resultList.length > 0) {
        return resultList;
    }
    else {
        logging_1.getLogger("unknown").error("Scenario '" + scenarioName + "' not found in the directory!");
        process.exit(1);
    }
};
exports.loadAllScenarios = function (path, actionCatalog) {
    var loadedScenarios = [];
    FS.readdirSync("" + path).forEach(function (file) {
        var scenarioDef = yamlParsing_1.loadYamlConfiguration(path + "/" + file);
        if (scenarioDef) {
            // split into multiple scenario instances
            if (scenarioDef.loadFactor) {
                for (var _i = 0; _i < scenarioDef.loadFactor; _i++) {
                    var scenarioNameWithIdx = yamlParsing_1.nameFromYamlConfig(file) + "-" + _i;
                    var ctx = { scenario: scenarioNameWithIdx };
                    var actionCatalogWithReplacedLoadVariables = [];
                    Object.assign(actionCatalogWithReplacedLoadVariables, actionCatalog);
                    // inject loadVariables[_i] into the action definitions
                    if (scenarioDef.loadVariables) {
                        var currentLoadVariables = getLoadVariableTreeForLoadIdx(scenarioDef.loadVariables, _i);
                        var _loop_1 = function (_current) {
                            var currentLoad = _current[1];
                            var actionToBeReplaced = actionCatalogWithReplacedLoadVariables.find(function (a) { return a.name === currentLoad.name; });
                            if (actionToBeReplaced) {
                                for (var _a = 0, _b = Object.keys(currentLoad); _a < _b.length; _a++) {
                                    var key = _b[_a];
                                    if (key !== 'name') {
                                        if (actionToBeReplaced[key] && typeof actionToBeReplaced[key] === 'object') {
                                            logging_1.getLogger(scenarioNameWithIdx).debug("Replacing \"" + querystring_1.stringify(actionToBeReplaced[key]) + "\" with \"" + querystring_1.stringify(currentLoad[key]) + "\" for key \"" + key + "\"", Object.assign(ctx, { action: actionToBeReplaced.name }));
                                            Object.assign(actionToBeReplaced[key], currentLoad[key]);
                                        }
                                        else if (actionToBeReplaced[key]) {
                                            logging_1.getLogger(scenarioNameWithIdx).debug("Replacing \"" + actionToBeReplaced[key] + "\" with \"" + currentLoad[key] + "\" for key \"" + key + "\"", Object.assign(ctx, { action: actionToBeReplaced.name }));
                                            actionToBeReplaced[key] = currentLoad[key];
                                        }
                                    }
                                }
                            }
                        };
                        for (var _a = 0, _b = Object.entries(currentLoadVariables); _a < _b.length; _a++) {
                            var _current = _b[_a];
                            _loop_1(_current);
                        }
                    }
                    loadedScenarios.push(new Scenario_1.Scenario(scenarioNameWithIdx, scenarioDef, actionCatalogWithReplacedLoadVariables));
                }
            }
            else {
                // just one instance of the scenario
                loadedScenarios.push(new Scenario_1.Scenario(yamlParsing_1.nameFromYamlConfig(file), scenarioDef, actionCatalog));
            }
        }
    });
    return loadedScenarios;
};
function getLoadVariableTreeForLoadIdx(rootObject, idx) {
    var res = {};
    Object.assign(res, rootObject);
    for (var _a = 0, _b = Object.entries(rootObject); _a < _b.length; _a++) {
        var propEntry = _b[_a];
        if (propEntry[0] == 'name')
            continue;
        if (Array.isArray(propEntry[1])) {
            var loadVars = propEntry[1];
            if (loadVars.length == 1 && loadVars[0].indexOf("...") >= 0) {
                var stringPrefix = loadVars[0].substr(0, loadVars[0].indexOf("$$"));
                var numberRange = loadVars[0].replace("$$", "").substring(stringPrefix.length);
                var limits = numberRange.split("...");
                var minValue = Number.parseInt(limits[0]);
                var maxValue = Number.parseInt(limits[1]);
                var offset = (minValue + idx) <= maxValue ? idx : (minValue + idx - maxValue);
                // console.log(`${stringPrefix} | ${numberRange} | ${minValue} | ${maxValue} | ${offset}`);
                Object.defineProperty(res, propEntry[0], { value: "" + stringPrefix + (minValue + offset) });
            }
            else {
                Object.defineProperty(res, propEntry[0], { value: loadVars[idx % loadVars.length] });
            }
        }
        else {
            Object.defineProperty(res, propEntry[0], { value: getLoadVariableTreeForLoadIdx(rootObject[propEntry[0]], idx) });
        }
    }
    return res;
}
