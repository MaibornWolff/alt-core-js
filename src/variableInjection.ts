import { runInNewContext } from 'vm';
import { getLogger, LoggingContext } from './logging';
import { nodeGlobals } from './nodeGlobals';

export function injectVariableAccessAndEvaluate(
    expression: string,
    scenarioVariables: Map<string, unknown>,
): unknown {
    const regex = /{{(\w*)}}/g;
    const variables: { [key: string]: unknown } = {};
    const expressionWithVariables = searchForMatchingStrings(
        regex,
        expression,
    ).reduce((previousString, variable) => {
        variables[variable] = scenarioVariables.get(variable);
        const searchValue = `{{${variable}}}`;
        return previousString.replace(searchValue, variable);
    }, expression);

    return runInNewContext(expressionWithVariables, {
        ...nodeGlobals,
        ...variables,
    });
}

function injectVarsToString(
    str: string,
    scenarioVariables: Map<string, unknown>,
    ctx: LoggingContext,
): string {
    const regex = /{{(\w*)}}/g;
    return searchForMatchingStrings(regex, str).reduce(
        (previousString, variable) => {
            const replaceValue = scenarioVariables.get(variable);
            if (replaceValue !== undefined) {
                const searchValue = `{{${variable}}}`;
                getLogger(ctx.scenario).debug(
                    `Replacing '${searchValue}' with '${replaceValue}'`,
                    ctx,
                );
                return previousString.replace(searchValue, `${replaceValue}`);
            }
            getLogger(ctx.scenario).debug(
                `Not able to replace {{${variable}}} because no variable with that name found!`,
                ctx,
            );
            return previousString;
        },
        str,
    );
}

export function injectEvalAndVarsToString(
    str: string,
    scenarioVariables: Map<string, unknown>,
    ctx: LoggingContext,
): string | number {
    const afterEvalToString = injectEvaluationToString(
        str,
        ctx,
        scenarioVariables,
    );
    const afterVarInjection = injectVarsToString(
        afterEvalToString,
        scenarioVariables,
        ctx,
    );
    const [
        afterEvalToNumber,
        foundNumericExpression,
    ] = injectEvaluationToNumber(afterVarInjection, ctx, scenarioVariables);

    // if the string contains only number description, that can be converted, then return a number, in other case return a string
    if (
        foundNumericExpression &&
        afterEvalToNumber === (+afterEvalToNumber).toString()
    ) {
        return +afterEvalToNumber;
    }
    return afterEvalToNumber;
}

export function injectEvalAndVarsToMap(
    keyValueMap: any,
    scenarioVariables: Map<string, unknown>,
    ctx: LoggingContext,
): any {
    const copy = keyValueMap instanceof Array ? [] : {};
    Object.assign(copy, keyValueMap);
    for (const mapEntry of Object.entries(copy)) {
        const key = mapEntry[0];
        const value = mapEntry[1];

        if (value instanceof Object) {
            // contains nested values
            copy[key] = injectEvalAndVarsToMap(value, scenarioVariables, ctx);
        } else if (typeof value === 'string') {
            copy[key] = injectEvalAndVarsToString(
                value,
                scenarioVariables,
                ctx,
            );
        }
    }
    return copy;
}

function searchForMatchingStrings(regex: RegExp, str: string): string[] {
    const regexCopy = regex;
    let m;
    const matchingStrings: string[] = [];
    while ((m = regexCopy.exec(str)) !== null) {
        if (m.index === regexCopy.lastIndex) regexCopy.lastIndex += 1;
        matchingStrings.push(m[1]);
    }
    return matchingStrings;
}

function injectEvaluationToString(
    str: string,
    ctx: LoggingContext,
    vars: Map<string, unknown>,
): string {
    // the vars (scenario variable) should be left available here in order to access
    // and set them from within evaluated expressions

    const regex = /{{{(.*?)}}}/g;
    let result = str;
    searchForMatchingStrings(regex, result).forEach(expression => {
        const replaceValue = (() => eval(expression)).call(
            buildExpHelpers(vars),
        );
        if (replaceValue) {
            const searchValue = `{{{${expression}}}}`;
            getLogger(ctx.scenario).debug(
                `Replacing '${searchValue}' with '${replaceValue}'`,
                ctx,
            );
            result = result.replace(searchValue, replaceValue);
        } else {
            getLogger(ctx.scenario).debug(
                `Not able to replace {{{${expression}}}} !`,
                ctx,
            );
        }
    });

    return result;
}

function injectEvaluationToNumber(
    str: string,
    ctx: LoggingContext,
    vars: Map<string, unknown>,
): [string, boolean] {
    // the vars (scenario variable) should be left available here in order to access
    // and set them from within evaluated expressions

    const regex = /<<<(.*?)>>>/g;
    let foundNumericExpression = false;
    let result = str;
    searchForMatchingStrings(regex, result).forEach(expression => {
        foundNumericExpression = true;
        const replaceValue = (() => eval(expression)).call(
            buildExpHelpers(vars),
        );
        if (replaceValue) {
            const searchValue = `<<<${expression}>>>`;
            getLogger(ctx.scenario).debug(
                `Replacing '"${searchValue}"' with '${replaceValue}'`,
                ctx,
            );
            result = result.replace(searchValue, replaceValue);
        } else {
            getLogger(ctx.scenario).debug(
                `Not able to replace {{{${expression}}}} !`,
                ctx,
            );
        }
    });

    return [result, foundNumericExpression];
}

function buildExpHelpers(vars: Map<string, any>): unknown {
    return {
        get(name: string): any {
            return vars.get(name);
        },
        set(name: string, value: any) {
            return vars.set(name, value);
        },
        getAndInc(name: string): number {
            const currentValue = vars.get(name);
            vars.set(name, currentValue + 1);
            return currentValue;
        },
        getAndIncBy(name: string, howMuch: number): number {
            const currentValue = vars.get(name);
            vars.set(name, currentValue + howMuch);
            return currentValue;
        },
        incAndGet(name: string): number {
            const targetValue = vars.get(name) + 1;
            vars.set(name, targetValue);
            return targetValue;
        },
        incByAndGet(name: string, howMuch: number): number {
            const targetValue = vars.get(name) + howMuch;
            vars.set(name, targetValue);
            return targetValue;
        },
        datePlusMinutesIso(minutes: number): string {
            return new Date(Date.now() + minutes * 60e3).toISOString();
        },
        timestampPlusMinutes(minutes: number): number {
            return Date.now() + minutes * 60e3;
        },
    };
}
