import {getLogger} from "./logging";

export const injectVarsToString = (str: string, scenarioVariables: Map<string, string>, ctx: any): string => {

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
};

export const injectVarsToMap = (keyValueMap: any, scenarioVariables: Map<string, string>, loggingCtx: any): any => {

    let copy: any = {};
    Object.assign(copy, keyValueMap);
    for (let mapEntry of Object.entries(copy)) {
        let key = mapEntry[0];
        let value = mapEntry[1] as string;
        copy[key] = injectVarsToString(value, scenarioVariables, loggingCtx);
    }
    return copy;
};

function searchForMatchingStrings(regex: RegExp, str: string) {
    let m;
    let matchingStrings: string[] = [];
    while ((m = regex.exec(str)) !== null) {

        if (m.index === regex.lastIndex) regex.lastIndex++;
        matchingStrings.push(m[1]);
    }
    return matchingStrings;
}

export const injectEvaluationToString = (str: string, ctx: any, vars: Map<string, string>): string => {
    // the vars (scenario variable) should be left available here in order to access
    // and set them from within evaluated expressions

    const regex = /{{{(.*?)}}}/g;

    searchForMatchingStrings(regex, str).forEach(expression => {
        let replaceValue = function() { return eval(expression); }.call(vars);
        if (replaceValue) {
            let searchValue = `{{{${expression}}}}`;
            getLogger(ctx.scenario).debug(`Replacing '${searchValue}' with '${replaceValue}'`, ctx);
            str = str.replace(searchValue, replaceValue)
        } else {
            getLogger(ctx.scenario).debug(`Not able to replace {{{${expression}}}} !`, ctx);
        }
    });

    return str;
};

export const injectEvaluationToNumber = (str: string, ctx: any, vars: Map<string, string>): string => {
    // the vars (scenario variable) should be left available here in order to access
    // and set them from within evaluated expressions

    const regex = /<<<(.*?)>>>/g;

    searchForMatchingStrings(regex, str).forEach(expression => {
        let replaceValue = function() { return eval(expression); }.call(vars);
        if (replaceValue) {
            let searchValue = `<<<${expression}>>>`;
            getLogger(ctx.scenario).debug(`Replacing '"${searchValue}"' with '${replaceValue}'`, ctx);
            str = str.replace(`"${searchValue}"`, replaceValue)
        } else {
            getLogger(ctx.scenario).debug(`Not able to replace {{{${expression}}}} !`, ctx);
        }
    });

    return str;
};

export const injectEvaluationToMap = (keyValueMap: any, loggingCtx: any,
                                      scenarioVariables: Map<string, string>): any => {

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

    let asString = JSON.stringify(keyValueMap);
    let replaced = injectEvaluationToString(asString, loggingCtx, scenarioVariables);
    replaced = injectEvaluationToNumber(replaced, loggingCtx, scenarioVariables);

    return JSON.parse(replaced);
};