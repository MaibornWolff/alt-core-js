import { createReadStream } from 'fs';
import * as request from 'requestretry';
import {
    addFailedResponse,
    addRequest,
    addSuccessfulResponse,
} from '../diagramDrawing';
import { getLogger } from '../logging';
import {
    injectEvalAndVarsToMap,
    injectEvalAndVarsToString,
} from '../variableInjection';
import { Action } from './Action';
import { ActionCallback } from './ActionCallback';
import { ActionType } from './ActionType';
import { Scenario } from './Scenario';

class RestAction implements Action {
    public serviceName: string;

    public name: string;

    public description: string;

    public type = ActionType.REST;

    public url: string;

    public method: string;

    public queryParameters: Map<string, string>;

    public restHead: any;

    public data: Map<string, string>;

    public dataBinary: string;

    public form: any;

    public responseValidation: string[];

    public variables: Map<string, string>;

    public invokeEvenOnFail = false;

    public constructor(
        name: string,
        desc = name,
        actionDef: any,
        url: string,
        serviceName: string,
        restMethod = actionDef.method,
        queryParameters = actionDef.queryParameters,
        restHeaders = actionDef.headers,
        restData = actionDef.data,
        restDataBinary = actionDef.dataBinary,
        restForm = actionDef.form,
        validators = actionDef.responseValidation,
        vars = actionDef.variables,
        invokeOnFail = actionDef.invokeEvenOnFail,
    ) {
        this.name = name;
        this.description = desc;
        this.url = url;
        this.serviceName = serviceName;
        this.method = restMethod;
        this.queryParameters = queryParameters;
        this.restHead = restHeaders;
        this.data = restData;
        this.dataBinary = restDataBinary;
        this.form = restForm;
        this.responseValidation = validators ? [].concat(validators) : [];
        this.variables = vars;
        this.invokeEvenOnFail = invokeOnFail;
    }

    public static fromTemplate(
        actionDef: any,
        template: RestAction,
    ): RestAction {
        return new RestAction(
            actionDef.name,
            actionDef.description || actionDef.name,
            actionDef,
            template.url,
            template.serviceName,
            actionDef.method || template.method,
            template.queryParameters
                ? { ...template.queryParameters, ...actionDef.queryParameters }
                : actionDef.queryParameters,
            template.restHead
                ? { ...template.restHead, ...actionDef.headers }
                : actionDef.restHead,
            this.loadData(template, actionDef),
            actionDef.dataBinary || template.dataBinary,
            template.form ? { ...template.form, ...actionDef.form } : null,
            template.responseValidation
                ? template.responseValidation.concat(
                      actionDef.responseValidation || [],
                  )
                : actionDef.responseValidation,
            template.variables
                ? Object.assign(template.variables, actionDef.variables)
                : actionDef.variables,
            actionDef.invokeEvenOnFail || template.invokeEvenOnFail,
        );
    }

    private static loadData(template: RestAction, actionDef: any) {
        if (template.data) {
            if (Array.isArray(template.data))
                return template.data.concat(actionDef.data || []);
            return Object.assign(
                Object.assign({}, template.data),
                actionDef.data,
            );
        }
        return actionDef.data;
    }

    public invoke(scenario: Scenario): ActionCallback {
        const ctx = { scenario: scenario.name, action: this.name };
        const scenarioVariables = this.variables;
        const registeredValidations = this.responseValidation;
        const targetService = this.serviceName;

        const logError = function(errorMessage: string) {
            getLogger(ctx.scenario).error(errorMessage, ctx);
        };

        const logDebug = function(debugMessage: string) {
            getLogger(ctx.scenario).debug(debugMessage, ctx);
        };

        const updateScenarioCache = function(res: any, head: any) {
            // `res` & `head` needed for the `eval()` call
            if (scenarioVariables) {
                for (const pair of Object.entries(scenarioVariables)) {
                    if (pair[1].startsWith('res') && res) {
                        scenario.cache.set(pair[0], eval(pair[1]));
                    } else if (pair[1].startsWith('head') && head) {
                        scenario.cache.set(pair[0], eval(pair[1]));
                    }
                    logDebug(
                        `Setting cache: ${pair[0]} = ${scenario.cache.get(
                            pair[0],
                        )}`,
                    );
                }
            }
        };

        const validateHeaders = function(head: any, reject: any) {
            if (registeredValidations) {
                registeredValidations
                    .filter(v => v.startsWith('head.'))
                    .forEach(validation => {
                        try {
                            const validationResult = eval(validation);
                            if (validationResult) {
                                logDebug(
                                    `Header validation (${validation}): ${validationResult}`,
                                );
                            } else {
                                logError(
                                    `Header validation (${validation}): ${validationResult}`,
                                );
                                reject(head);
                            }
                        } catch (e) {
                            logError(e.message);
                            reject(head);
                        }
                    });
            }
        };

        const validateBody = function(res: any, reject: any) {
            if (registeredValidations) {
                registeredValidations
                    .filter(v => v.startsWith('res.'))
                    .forEach(validation => {
                        try {
                            const validationResult = eval(validation);
                            if (validationResult) {
                                logDebug(
                                    `Body validation (${validation}): ${validationResult}`,
                                );
                            } else {
                                logError(
                                    `Body validation (${validation}): ${validationResult}`,
                                );
                                reject(res);
                            }
                        } catch (e) {
                            logError(e.message);
                            reject(res);
                        }
                    });
            }
        };

        const concatParams = (paramMap: Map<string, string>): string =>
            Array.from(paramMap.entries())
                .map(([key, value]) => `${key}=${value}`)
                .join('&');

        const promise = new Promise((resolve, reject) => {
            const requestHeaders = this.restHead
                ? injectEvalAndVarsToMap(this.restHead, scenario.cache, ctx)
                : null;
            const requestBody = this.data
                ? Array.isArray(this.data)
                    ? JSON.stringify(this.data)
                    : JSON.stringify(
                          injectEvalAndVarsToMap(
                              this.data,
                              scenario.cache,
                              ctx,
                          ),
                      )
                : null;
            const requestForm = this.form
                ? injectEvalAndVarsToMap(this.form, scenario.cache, ctx)
                : null;
            const binaryData = this.dataBinary
                ? createReadStream(this.dataBinary)
                : null;
            const requestUrl = this.queryParameters
                ? this.url + '?' + concatParams(this.queryParameters)
                : this.url;

            request({
                method: this.method,
                url: injectEvalAndVarsToString(requestUrl, scenario.cache, ctx),
                headers: requestHeaders,
                body: requestBody || binaryData,
                encoding: binaryData ? null : undefined,
                form: requestForm,
                maxAttempts: 3,
                retryDelay: 1000, // 1s
                fullResponse: true,
            })
                .then(response => {
                    // console.log(response.toJSON());

                    logDebug(
                        `Calling:  ${response.request.method} ${
                            response.request.href
                        }`,
                    );
                    logDebug(
                        `          ${JSON.stringify(response.request.headers)}`,
                    );
                    logDebug(
                        `          ${
                            requestForm
                                ? JSON.stringify(requestForm)
                                : requestBody || '-'
                        }`,
                    );

                    addRequest(
                        scenario.name,
                        targetService,
                        `${response.request.method} ${response.request.path}`,
                        JSON.parse(requestBody),
                    );

                    if (
                        response.statusCode === 200 ||
                        response.statusCode === 201
                    ) {
                        logDebug(
                            `Response: ${response.statusCode} (${
                                response.statusMessage
                            }): ${response.body}`,
                        );
                        logDebug(
                            `Response Headers: ${JSON.stringify(
                                response.headers,
                            )}`,
                        );

                        let head = response.headers;
                        validateHeaders(head, reject);
                        updateScenarioCache(null, head);

                        let res: any;
                        const contentType = response.headers['content-type'];
                        if (contentType != null) {
                            if (contentType.startsWith('application/json')) {
                                res = JSON.parse(response.body);
                            } else if (contentType.startsWith('text/plain')) {
                                res = response.body.toString();
                            } else {
                                const body = [];
                                body.push(response.body);
                                res = Buffer.concat(body).toString();
                            }
                            addSuccessfulResponse(
                                scenario.name,
                                targetService,
                                `${response.statusMessage} (${
                                    response.statusCode
                                })`,
                                res,
                            );

                            validateBody(res, reject);

                            updateScenarioCache(res, null);
                        } else {
                            addSuccessfulResponse(
                                scenario.name,
                                targetService,
                                `${response.statusMessage} (${
                                    response.statusCode
                                })`,
                                null,
                            );
                        }

                        return resolve();
                    }
                    if (response.statusCode === 204) {
                        logDebug(
                            `Response: ${response.statusCode} (${
                                response.statusMessage
                            })`,
                        );
                        addSuccessfulResponse(
                            scenario.name,
                            targetService,
                            `${response.statusMessage} (${
                                response.statusCode
                            })`,
                            null,
                        );
                        resolve();
                    } else {
                        logError(
                            `Response: ${response.statusCode} (${
                                response.statusMessage
                            })`,
                        );
                        logError(`          ${response.body}`);
                        addFailedResponse(
                            scenario.name,
                            targetService,
                            `${response.statusMessage} (${
                                response.statusCode
                            })`,
                            response.body,
                        );
                        reject();
                    }
                })
                .catch(error => {
                    logError(`Unexpected ERROR occurred: ${error}`);
                    return reject();
                });
        });

        return { promise, cancel: () => console.log('TODO') };
    }
}

export { RestAction };
