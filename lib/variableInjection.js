"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var logging_1 = require("./logging");
function injectVarsToString(str, scenarioVariables, ctx) {
    var regex = /{{(\w*)}}/g;
    searchForMatchingStrings(regex, str).forEach(function (variable) {
        var replaceValue = scenarioVariables.get(variable);
        if (replaceValue) {
            var searchValue = "{{" + variable + "}}";
            logging_1.getLogger(ctx.scenario).debug("Replacing '" + searchValue + "' with '" + replaceValue + "'", ctx);
            str = str.replace(searchValue, replaceValue);
        }
        else {
            logging_1.getLogger(ctx.scenario).debug("Not able to replace {{" + variable + "}} because no variable with that name found!", ctx);
        }
    });
    return str;
}
function injectEvalAndVarsToString(str, scenarioVariables, ctx) {
    var afterEvalToString = injectEvaluationToString(str, ctx, scenarioVariables);
    var afterVarInjection = injectVarsToString(afterEvalToString, scenarioVariables, ctx);
    var afterEvalToNumber = injectEvaluationToNumber(afterVarInjection, ctx, scenarioVariables);
    // if the string contains only number description, that can be converted, then return a number, in other case return a string
    if (+afterEvalToNumber === +afterEvalToNumber) {
        return +afterEvalToNumber;
    }
    else {
        return afterEvalToNumber;
    }
}
exports.injectEvalAndVarsToString = injectEvalAndVarsToString;
function injectEvalAndVarsToMap(keyValueMap, scenarioVariables, loggingCtx) {
    var copy = {};
    Object.assign(copy, keyValueMap);
    for (var _i = 0, _a = Object.entries(copy); _i < _a.length; _i++) {
        var mapEntry = _a[_i];
        var key = mapEntry[0];
        var value = mapEntry[1];
        if (value instanceof Object) {
            // contains nested values
            copy[key] = injectEvalAndVarsToMap(value, scenarioVariables, loggingCtx);
        }
        else {
            copy[key] = injectEvalAndVarsToString(value, scenarioVariables, loggingCtx);
        }
    }
    return copy;
}
exports.injectEvalAndVarsToMap = injectEvalAndVarsToMap;
function searchForMatchingStrings(regex, str) {
    var m;
    var matchingStrings = [];
    while ((m = regex.exec(str)) !== null) {
        if (m.index === regex.lastIndex)
            regex.lastIndex++;
        matchingStrings.push(m[1]);
    }
    return matchingStrings;
}
function injectEvaluationToString(str, ctx, vars) {
    // the vars (scenario variable) should be left available here in order to access
    // and set them from within evaluated expressions
    var regex = /{{{(.*?)}}}/g;
    searchForMatchingStrings(regex, str).forEach(function (expression) {
        var replaceValue = function () { return eval(expression); }.call(vars);
        if (replaceValue) {
            var searchValue = "{{{" + expression + "}}}";
            logging_1.getLogger(ctx.scenario).debug("Replacing '" + searchValue + "' with '" + replaceValue + "'", ctx);
            str = str.replace(searchValue, replaceValue);
        }
        else {
            logging_1.getLogger(ctx.scenario).debug("Not able to replace {{{" + expression + "}}} !", ctx);
        }
    });
    return str;
}
function injectEvaluationToNumber(str, ctx, vars) {
    // the vars (scenario variable) should be left available here in order to access
    // and set them from within evaluated expressions
    var regex = /<<<(.*?)>>>/g;
    searchForMatchingStrings(regex, str).forEach(function (expression) {
        var replaceValue = function () { return eval(expression); }.call(vars);
        if (replaceValue) {
            var searchValue = "<<<" + expression + ">>>";
            logging_1.getLogger(ctx.scenario).debug("Replacing '\"" + searchValue + "\"' with '" + replaceValue + "'", ctx);
            str = str.replace(searchValue, replaceValue);
        }
        else {
            logging_1.getLogger(ctx.scenario).debug("Not able to replace {{{" + expression + "}}} !", ctx);
        }
    });
    return str;
}
