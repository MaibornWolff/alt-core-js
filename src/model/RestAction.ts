import { Action } from './Action';
import { Scenario } from './Scenario';
import { getLogger } from '../logging';
import { ActionType } from './ActionType';
import {
    injectEvalAndVarsToMap,
    injectEvalAndVarsToString,
} from '../variableInjection';
import { ActionCallback } from './ActionCallback';
import {
    addFailedResponse,
    addRequest,
    addSuccessfulResponse,
} from '../diagramDrawing';

let request = require('requestretry');
const FS = require('fs');

class RestAction implements Action {
    serviceName: string;
    name: string;
    type = ActionType.REST;
    url: string;
    method: string;
    restHead: any;
    data: Map<string, string>;
    dataBinary: string;
    form: any;
    responseValidation: string[];
    variables: Map<string, string>;

    constructor(
        name: string,
        actionDef: any,
        url: string,
        serviceName: string,
        restMethod = actionDef.method,
        restHeaders = actionDef.headers,
        restData = actionDef.data,
        restDataBinary = actionDef.dataBinary,
        restForm = actionDef.form,
        validators = actionDef.responseValidation,
        vars = actionDef.variables,
    ) {
        this.name = name;
        this.url = url;
        this.serviceName = serviceName;
        this.method = restMethod;
        this.restHead = restHeaders;
        this.data = restData;
        this.dataBinary = restDataBinary;
        this.form = restForm;
        this.responseValidation = validators ? [].concat(validators) : [];
        this.variables = vars;
    }

    static fromTemplate(actionDef: any, template: RestAction): RestAction {
        return new RestAction(
            actionDef.name,
            actionDef,
            template.url,
            template.serviceName,
            actionDef.method || template.method,
            template.restHead
                ? Object.assign(
                      Object.assign({}, template.restHead),
                      actionDef.headers,
                  )
                : actionDef.restHead,
            this.loadData(template, actionDef),
            actionDef.dataBinary || template.dataBinary,
            template.form
                ? Object.assign(
                      Object.assign({}, template.form),
                      actionDef.form,
                  )
                : null,
            template.responseValidation
                ? template.responseValidation.concat(
                      actionDef.responseValidation || [],
                  )
                : actionDef.responseValidation,
            template.variables
                ? Object.assign(template.variables, actionDef.variables)
                : actionDef.variables,
        );
    }

    private static loadData(template: RestAction, actionDef: any) {
        if (template.data) {
            if (Array.isArray(template.data))
                return template.data.concat(actionDef.data || []);
            else
                return Object.assign(
                    Object.assign({}, template.data),
                    actionDef.data,
                );
        } else {
            return actionDef.data;
        }
    }

    invoke(scenario: Scenario): ActionCallback {
        const ctx = { scenario: scenario.name, action: this.name };
        const scenarioVariables = this.variables;
        const registeredValidations = this.responseValidation;
        const targetService = this.serviceName;

        let logError = function(errorMessage: string) {
            getLogger(ctx.scenario).error(errorMessage, ctx);
        };

        let logDebug = function(debugMessage: string) {
            getLogger(ctx.scenario).debug(debugMessage, ctx);
        };

        let updateScenarioCache = function(res: any) {
            // `res` needed for the `eval()` call
            if (scenarioVariables) {
                for (let pair of Object.entries(scenarioVariables)) {
                    scenario.cache.set(pair[0], eval(pair[1]));
                    logDebug(
                        `Setting cache: ${pair[0]} = ${scenario.cache.get(
                            pair[0],
                        )}`,
                    );
                }
            }
        };

        let validateAssertions = function(res: any, reject: any) {
            if (registeredValidations) {
                registeredValidations.forEach(validation => {
                    try {
                        let validationResult = eval(validation);
                        if (validationResult) {
                            logDebug(
                                `Validation (${validation}): ${validationResult}`,
                            );
                        } else {
                            logError(
                                `Validation (${validation}): ${validationResult}`,
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

        const promise = new Promise((resolve, reject) => {
            let requestHeaders = this.restHead
                ? injectEvalAndVarsToMap(this.restHead, scenario.cache, ctx)
                : null;
            let requestBody = this.data
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
            let requestForm = this.form
                ? injectEvalAndVarsToMap(this.form, scenario.cache, ctx)
                : null;
            let binaryData = this.dataBinary
                ? FS.createReadStream(this.dataBinary)
                : null;

            request({
                method: this.method,
                url: injectEvalAndVarsToString(this.url, scenario.cache, ctx),
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

                        let res: any;
                        let contentType = response.headers['content-type'];
                        if (contentType != null) {
                            if (contentType.startsWith('application/json')) {
                                res = JSON.parse(response.body);
                            } else if (contentType.startsWith('text/plain')) {
                                res = response.body.toString();
                            } else {
                                let body = [];
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

                            validateAssertions(res, reject);

                            updateScenarioCache(res);
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
                    } else if (response.statusCode === 204) {
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
                            'Response: ' +
                                response.statusCode +
                                ' (' +
                                response.statusMessage +
                                ')',
                        );
                        logError('          ' + response.body);
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
                    logError('Unexpected ERROR occurred: ' + error);
                    return reject();
                });
        });

        return { promise, cancel: () => console.log('TODO') };
    }
}

export { RestAction };
