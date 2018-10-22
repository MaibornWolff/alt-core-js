"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var logging_1 = require("./logging");
exports.injectVarsToString = function (str, scenarioVariables, ctx) {
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
};
exports.injectVarsToMap = function (keyValueMap, scenarioVariables, loggingCtx) {
    var copy = {};
    Object.assign(copy, keyValueMap);
    for (var _i = 0, _a = Object.entries(copy); _i < _a.length; _i++) {
        var mapEntry = _a[_i];
        var key = mapEntry[0];
        var value = mapEntry[1];
        copy[key] = exports.injectVarsToString(value, scenarioVariables, loggingCtx);
    }
    return copy;
};
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
exports.injectEvaluationToString = function (str, ctx, vars) {
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
};
exports.injectEvaluationToNumber = function (str, ctx, vars) {
    // the vars (scenario variable) should be left available here in order to access
    // and set them from within evaluated expressions
    var regex = /<<<(.*?)>>>/g;
    searchForMatchingStrings(regex, str).forEach(function (expression) {
        var replaceValue = function () { return eval(expression); }.call(vars);
        if (replaceValue) {
            var searchValue = "<<<" + expression + ">>>";
            logging_1.getLogger(ctx.scenario).debug("Replacing '\"" + searchValue + "\"' with '" + replaceValue + "'", ctx);
            str = str.replace("\"" + searchValue + "\"", replaceValue);
        }
        else {
            logging_1.getLogger(ctx.scenario).debug("Not able to replace {{{" + expression + "}}} !", ctx);
        }
    });
    return str;
};
exports.injectEvaluationToMap = function (keyValueMap, loggingCtx, scenarioVariables) {
    // let copy: any = {};
    // Object.assign(copy, keyValueMap);
    // for (let mapEntry of Object.entries(copy)) {
    //     let key = mapEntry[0];
    //     let value = mapEntry[1] as string;
    //     if (Array.isArray(value)) {
    //         let arr = [];
    //         value.forEach(v => arr.push(injectEvaluationToMap(v, loggingCtx)));
    //         copy[key] = arr;
    //     } else if (typeof value === 'object') {
    //         copy[key] = injectEvaluationToMap(value, loggingCtx);
    //     } else {
    //         copy[key] = injectEvaluationToString(value, loggingCtx);
    //     }
    // }
    // return copy;
    var asString = JSON.stringify(keyValueMap);
    var replaced = exports.injectEvaluationToString(asString, loggingCtx, scenarioVariables);
    replaced = exports.injectEvaluationToNumber(replaced, loggingCtx, scenarioVariables);
    return JSON.parse(replaced);
};
