import { createReadStream, PathLike, readFileSync } from 'fs';
import { IncomingHttpHeaders } from 'http';
import { stringify } from 'querystring';
import { Response } from 'request';
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
import { Action, ActionDefinition } from './Action';
import { ActionCallback } from './ActionCallback';
import { ActionType } from './ActionType';
import { Scenario } from './Scenario';

// TODO: Implement correctly
export interface RestActionDefinition extends ActionDefinition {
    readonly type: 'REST';

    readonly service: string;
    readonly endpoint?: string;
    readonly method: string;
    readonly queryParameters?: { [key: string]: string };
    readonly headers?: { [key: string]: string };
    readonly data?: Map<string, string>;
    readonly dataBinary?: PathLike;
    readonly form?: { [key: string]: string };
    readonly responseValidation?: string[];
    readonly variables?: { [key: string]: string };
    readonly expectBinaryResponse?: boolean;
}

// TODO: Implement correctly
export function isRestActionDefinition(
    actionDef: ActionDefinition,
): actionDef is RestActionDefinition {
    return actionDef.type === ActionType[ActionType.REST];
}

class RestAction implements Action {
    public serviceName: string;

    public name: string;

    public description: string;

    public type = ActionType.REST;

    public url: string;

    public method: string;

    public queryParameters: { [key: string]: string };

    public restHead: { [key: string]: string };

    public data: Map<string, string>;

    public dataBinary: string;

    public form: { [key: string]: string };

    public responseValidation: string[];

    public variables: { [key: string]: string };

    public invokeEvenOnFail: boolean;

    public allowFailure: boolean;

    public readonly clientCertificatePath?: string;

    public readonly clientKeyPath?: string;

    private readonly expectBinaryResponse: boolean;

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
        validators = actionDef.responseValidation || [],
        vars = actionDef.variables,
        invokeOnFail = actionDef.invokeEvenOnFail || false,
        allowFailure = actionDef.allowFailure || false,
        clientCertificatePath = actionDef.clientCertificatePath,
        clientKeyPath = actionDef.clientKeyPath,
        expectBinaryResponse = actionDef.expectBinaryResponse || false,
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
        this.responseValidation = [...validators];
        this.variables = vars;
        this.invokeEvenOnFail = invokeOnFail;
        this.allowFailure = allowFailure;
        this.clientCertificatePath = clientCertificatePath;
        this.clientKeyPath = clientKeyPath;
        this.expectBinaryResponse = expectBinaryResponse;
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
                ? { ...template.variables, ...actionDef.variables }
                : actionDef.variables,
            actionDef.invokeEvenOnFail != null
                ? actionDef.invokeEvenOnFail
                : template.invokeEvenOnFail,
            actionDef.allowFailure != null
                ? actionDef.allowFailure
                : template.allowFailure,
            actionDef.clientCertificatePath || template.clientCertificatePath,
            actionDef.clientKeyPath || template.clientKeyPath,
            actionDef.expectBinaryResponse != null
                ? actionDef.expectBinaryResponse
                : template.expectBinaryResponse,
        );
    }

    private static loadData(template: RestAction, actionDef: any): any {
        if (template.data) {
            if (Array.isArray(template.data))
                return template.data.concat(actionDef.data || []);
            return {
                ...template.data,
                ...actionDef.data,
            };
        }
        return actionDef.data;
    }

    private static parseResponseBody(
        body: string | Buffer,
        contentType: string | undefined,
        ctx: { scenario: string; action: string },
    ): unknown {
        if (typeof body === 'string') {
            if (contentType && contentType.startsWith('application/json')) {
                return JSON.parse(body);
            }
            if (contentType && contentType.startsWith('text/plain')) {
                return body;
            }

            getLogger(ctx.scenario).debug(
                `Cannot parse string response body with content-type ${contentType}, handling it as string.`,
                ctx,
            );
            return body;
        }
        return Buffer.from(body);
    }

    public invoke(scenario: Scenario): ActionCallback {
        const ctx = { scenario: scenario.name, action: this.name };
        const scenarioVariables = this.variables;
        const registeredValidations = this.responseValidation;
        const targetService = this.serviceName;

        const logError = (errorMessage: string): void => {
            getLogger(ctx.scenario).error(errorMessage, ctx);
        };

        const logDebug = (debugMessage: string): void => {
            getLogger(ctx.scenario).debug(debugMessage, ctx);
        };

        // TODO: Split in 2 seperate functions for res and head
        const updateScenarioCache = ({
            res,
            head,
        }: {
            res?: unknown;
            head?: IncomingHttpHeaders;
        }): void => {
            // `res` & `head` needed for the `eval()` call
            if (scenarioVariables) {
                for (const pair of Object.entries(scenarioVariables)) {
                    if (pair[1].startsWith('res') && res !== undefined) {
                        scenario.cache.set(pair[0], eval(pair[1]));
                    } else if (
                        pair[1].startsWith('head') &&
                        head !== undefined
                    ) {
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

        const validateHeaders = (
            head: IncomingHttpHeaders,
            reject: (reason?: unknown) => void,
        ): void => {
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

        const validateBody = (
            res: unknown,
            reject: (reason?: unknown) => void,
        ): void => {
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

        const generateRequestBody = (): string | null => {
            if (!this.data) return null;
            return Array.isArray(this.data)
                ? JSON.stringify(this.data)
                : JSON.stringify(
                      injectEvalAndVarsToMap(this.data, scenario.cache, ctx),
                  );
        };

        const getClientCertificationConfiguration = (
            clientCertificatePath: string,
            clientKeyPath: string,
        ): { cert?: Buffer; key?: Buffer; rejectUnauthorized?: boolean } => {
            try {
                const cert = readFileSync(clientCertificatePath);
                const key = readFileSync(clientKeyPath);
                return {
                    cert,
                    key,
                    rejectUnauthorized: false,
                };
            } catch (error) {
                logError(error.message);
                return {};
            }
        };

        const promise = new Promise((resolve, reject) => {
            const requestHeaders = this.restHead
                ? injectEvalAndVarsToMap(this.restHead, scenario.cache, ctx)
                : null;
            const requestBody = generateRequestBody();
            const requestForm = this.form
                ? injectEvalAndVarsToMap(this.form, scenario.cache, ctx)
                : null;
            const binaryData = this.dataBinary
                ? createReadStream(this.dataBinary)
                : null;
            const baseURL = `${injectEvalAndVarsToString(
                this.url,
                scenario.cache,
                ctx,
            )}`;
            const queryParameters = this.queryParameters
                ? injectEvalAndVarsToMap(
                      this.queryParameters,
                      scenario.cache,
                      ctx,
                  )
                : undefined;
            const url = queryParameters
                ? `${baseURL}?${stringify(queryParameters)}`
                : baseURL;

            let requestOptions = {
                method: this.method,
                url,
                headers: requestHeaders,
                body: requestBody || binaryData,
                encoding: this.expectBinaryResponse ? null : undefined,
                form: requestForm,
                maxAttempts: 3,
                retryDelay: 1000, // 1s
                fullResponse: true,
            };

            if (this.clientCertificatePath && this.clientKeyPath) {
                requestOptions = {
                    ...requestOptions,
                    ...getClientCertificationConfiguration(
                        this.clientCertificatePath,
                        this.clientKeyPath,
                    ),
                };
            }

            request(requestOptions)
                .then((response: Response) => {
                    logDebug(
                        `Calling:  ${response.request.method} ${response.request.href}`,
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
                        requestBody && JSON.parse(requestBody),
                    );

                    if (
                        response.statusCode === 200 ||
                        response.statusCode === 201
                    ) {
                        logDebug(
                            `Response: ${response.statusCode} (${response.statusMessage}): ${response.body}`,
                        );
                        logDebug(
                            `Response Headers: ${JSON.stringify(
                                response.headers,
                            )}`,
                        );

                        const head = response.headers;
                        validateHeaders(head, reject);
                        updateScenarioCache({ head });

                        const contentType = response.headers['content-type'];
                        if (response.body != null) {
                            const res = RestAction.parseResponseBody(
                                response.body,
                                contentType,
                                ctx,
                            );
                            addSuccessfulResponse(
                                scenario.name,
                                targetService,
                                `${response.statusMessage} (${response.statusCode})`,
                                `${res}`, // TODO: Should this be added in case of binary data?
                            );

                            validateBody(res, reject);

                            updateScenarioCache({ res });
                        } else {
                            addSuccessfulResponse(
                                scenario.name,
                                targetService,
                                `${response.statusMessage} (${response.statusCode})`,
                            );
                        }

                        resolve();
                    } else if (response.statusCode === 204) {
                        logDebug(
                            `Response: ${response.statusCode} (${response.statusMessage})`,
                        );
                        addSuccessfulResponse(
                            scenario.name,
                            targetService,
                            `${response.statusMessage} (${response.statusCode})`,
                        );
                        resolve();
                    } else {
                        logError(
                            `Response: ${response.statusCode} (${response.statusMessage})`,
                        );
                        logError(`          ${response.body}`);
                        addFailedResponse(
                            scenario.name,
                            targetService,
                            `${response.statusMessage} (${response.statusCode})`,
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
