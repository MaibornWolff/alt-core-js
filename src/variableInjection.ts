import {getLogger} from "./logging";

function injectVarsToString(str: string, scenarioVariables: Map<string, any>, ctx: any): string {

    const regex = /{{(\w*)}}/g;

    searchForMatchingStrings(regex, str).forEach(variable => {
        let replaceValue = scenarioVariables.get(variable);
        if (replaceValue) {
            let searchValue = `{{${variable}}}`;
            getLogger(ctx.scenario).debug(`Replacing '${searchValue}' with '${replaceValue}'`, ctx);
            str = str.replace(searchValue, replaceValue)
        } else {
            getLogger(ctx.scenario).debug(`Not able to replace {{${variable}}} because no variable with that name found!`, ctx);
        }
    });

    return str;
}

export function injectEvalAndVarsToString(str: string, scenarioVariables: Map<string, any>, ctx: any): string|number {
    let afterEvalToString = injectEvaluationToString(str, ctx, scenarioVariables);
    let afterVarInjection = injectVarsToString(afterEvalToString, scenarioVariables, ctx);
    let [afterEvalToNumber, foundNumericExpression] = injectEvaluationToNumber(afterVarInjection, ctx, scenarioVariables);

    // if the string contains only number description, that can be converted, then return a number, in other case return a string
    if (foundNumericExpression && (+afterEvalToNumber === +afterEvalToNumber)) {
        return +afterEvalToNumber;
    } else {
        return afterEvalToNumber;
    }
}

export function injectEvalAndVarsToMap(keyValueMap: any, scenarioVariables: Map<string, any>, loggingCtx: any): any {

    let copy: any = {};
    Object.assign(copy, keyValueMap);
    for (let mapEntry of Object.entries(copy)) {
        let key = mapEntry[0];
        let value = mapEntry[1];

        if (value instanceof Object) {
            // contains nested values
            copy[key] = injectEvalAndVarsToMap(value, scenarioVariables, loggingCtx);
        } else {
            copy[key] = injectEvalAndVarsToString(value, scenarioVariables, loggingCtx);
        }
    }
    return copy;
}

function searchForMatchingStrings(regex: RegExp, str: string) {
    let m;
    let matchingStrings: string[] = [];
    while ((m = regex.exec(str)) !== null) {

        if (m.index === regex.lastIndex) regex.lastIndex++;
        matchingStrings.push(m[1]);
    }
    return matchingStrings;
}

function injectEvaluationToString(str: string, ctx: any, vars: Map<string, any>): string {
    // the vars (scenario variable) should be left available here in order to access
    // and set them from within evaluated expressions

    const regex = /{{{(.*?)}}}/g;

    searchForMatchingStrings(regex, str).forEach(expression => {
        let replaceValue = function() { return eval(expression); }.call(buildExpHelpers(vars));
        if (replaceValue) {
            let searchValue = `{{{${expression}}}}`;
            getLogger(ctx.scenario).debug(`Replacing '${searchValue}' with '${replaceValue}'`, ctx);
            str = str.replace(searchValue, replaceValue)
        } else {
            getLogger(ctx.scenario).debug(`Not able to replace {{{${expression}}}} !`, ctx);
        }
    });

    return str;
}

function injectEvaluationToNumber(str: string, ctx: any, vars: Map<string, any>): [string, boolean] {
    // the vars (scenario variable) should be left available here in order to access
    // and set them from within evaluated expressions

    const regex = /<<<(.*?)>>>/g;
    var foundNumericExpression = false;

    searchForMatchingStrings(regex, str).forEach(expression => {
        foundNumericExpression = true;
        let replaceValue = function() { return eval(expression); }.call(buildExpHelpers(vars));
        if (replaceValue) {
            let searchValue = `<<<${expression}>>>`;
            getLogger(ctx.scenario).debug(`Replacing '"${searchValue}"' with '${replaceValue}'`, ctx);
            str = str.replace(searchValue, replaceValue)
        } else {
            getLogger(ctx.scenario).debug(`Not able to replace {{{${expression}}}} !`, ctx);
        }
    });

    return [str, foundNumericExpression];
}

function buildExpHelpers(vars: Map<string, any>) {
    return {
        get: function (name: string): any {
            return vars.get(name);
        },
        set: function (name: string, value: any) {
            return vars.set(name, value);
        },
        getAndInc: function (name: string): number {
            let currentValue = vars.get(name);
            vars.set(name, currentValue + 1);
            return currentValue;
        },
        getAndIncBy: function (name: string, howMuch: number): number {
            let currentValue = vars.get(name);
            vars.set(name, currentValue + howMuch);
            return currentValue;
        },
        incAndGet: function (name: string): number {
            let targetValue = vars.get(name) + 1;
            vars.set(name, targetValue);
            return targetValue;
        },
        incByAndGet: function (name: string, howMuch: number): number {
            let targetValue = vars.get(name) + howMuch;
            vars.set(name, targetValue);
            return targetValue;
        },
        datePlusMinutesIso: function (minutes: number): string {
            return new Date(Date.now() + (minutes * 60e3)).toISOString();
        },
        timestampPlusMinutes: function (minutes: number): number {
            return Date.now() + (minutes * 60e3);
        }
    }
}