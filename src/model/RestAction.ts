import { createReadStream, PathLike, readFileSync, ReadStream } from 'fs';
import { IncomingHttpHeaders } from 'http';
import { stringify } from 'querystring';
import { Response } from 'request';
import * as request from 'requestretry';
import { DiagramConfiguration } from '../diagramDrawing/diagramDrawing';
import {
    addSuccessfulResponseBody,
    addValidationFailureResponseBody,
    addFailedResponse,
    addSuccessfulResponse,
    addSuccessfulResponseArrow,
    addRequest,
} from '../diagramDrawing/rest';
import { getLogger, LoggingContext } from '../logging';
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
    readonly variableAsPayload?: string;
    readonly responseValidation?: string[];
    readonly variables?: { [key: string]: string };
    readonly expectedStatusCodes?: number[];
    readonly clientCertificate?: string;
    readonly clientKey?: string;
    readonly expectBinaryResponse?: boolean;
    readonly diagramConfiguration?: DiagramConfiguration;
}

// TODO: Implement correctly
export function isRestActionDefinition(
    actionDef: ActionDefinition,
): actionDef is RestActionDefinition {
    return actionDef.type === ActionType[ActionType.REST];
}

class RestAction implements Action {
    readonly serviceName: string;

    readonly name: string;

    readonly description: string;

    readonly type = ActionType.REST;

    readonly url: string;

    readonly method: string;

    readonly queryParameters: { [key: string]: string };

    readonly restHead?: { [key: string]: string };

    readonly data?: Map<string, string>;

    readonly dataBinary?: string;

    readonly form?: { [key: string]: string };

    private readonly variableAsPayload?: string;

    readonly responseValidation?: string[];

    readonly variables?: { [key: string]: string };

    readonly expectedStatusCodes: number[];

    readonly invokeEvenOnFail: boolean;

    readonly allowFailure: boolean;

    readonly clientCertificate?: string;

    readonly clientKey?: string;

    private readonly expectBinaryResponse: boolean;

    private readonly diagramConfiguration: DiagramConfiguration;

    public constructor(
        name: string,
        desc = name,
        actionDef: any,
        url: string,
        serviceName: string,
        restMethod = actionDef.method,
        queryParameters = actionDef.queryParameters ?? {},
        restHeaders = actionDef.headers,
        restData = actionDef.data,
        restDataBinary = actionDef.dataBinary,
        restForm = actionDef.form,
        variableAsPayload = actionDef.variableAsPayload,
        validators = actionDef.responseValidation ?? [],
        vars = actionDef.variables,
        expectedStatusCodes = actionDef.expectedStatusCodes ?? [200, 201, 204],
        invokeOnFail = actionDef.invokeEvenOnFail ?? false,
        allowFailure = actionDef.allowFailure ?? false,
        clientCertificate = actionDef.clientCertificate,
        clientKey = actionDef.clientKey,
        expectBinaryResponse = actionDef.expectBinaryResponse ?? false,
        diagramConfiguration = actionDef.diagramConfiguration ?? {},
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
        this.variableAsPayload = variableAsPayload;
        this.responseValidation = [...validators];
        this.variables = vars;
        this.expectedStatusCodes = expectedStatusCodes;
        this.invokeEvenOnFail = invokeOnFail;
        this.allowFailure = allowFailure;
        this.clientCertificate = clientCertificate;
        this.clientKey = clientKey;
        this.expectBinaryResponse = expectBinaryResponse;
        this.diagramConfiguration = diagramConfiguration;
    }

    public static fromTemplate(
        actionDef: any,
        template: RestAction,
    ): RestAction {
        return new RestAction(
            actionDef.name,
            actionDef.description ?? actionDef.name,
            actionDef,
            template.url,
            template.serviceName,
            actionDef.method ?? template.method,
            { ...template.queryParameters, ...actionDef.queryParameters },
            template.restHead
                ? { ...template.restHead, ...actionDef.headers }
                : actionDef.restHead,
            this.loadData(template, actionDef),
            actionDef.dataBinary ?? template.dataBinary,
            template.form ? { ...template.form, ...actionDef.form } : null,
            actionDef.variableAsPayload ?? template.variableAsPayload,
            template.responseValidation
                ? template.responseValidation.concat(
                      actionDef.responseValidation || [],
                  )
                : actionDef.responseValidation,
            { ...template.variables, ...actionDef.variables },
            actionDef.expectedStatusCodes ?? template.expectedStatusCodes,
            actionDef.invokeEvenOnFail ?? template.invokeEvenOnFail,
            actionDef.allowFailure ?? template.allowFailure,
            actionDef.clientCertificate ?? template.clientCertificate,
            actionDef.clientKey ?? template.clientKey,
            actionDef.expectBinaryResponse ?? template.expectBinaryResponse,
            actionDef.diagramConfiguration ?? template.diagramConfiguration,
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
        ctx: LoggingContext,
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
        return Buffer.from(body); // TODO: Do we actually need to create a copy here or could we simply return `body`?
    }

    public invoke(scenario: Scenario): ActionCallback {
        const ctx = { scenario: scenario.name, action: this.name };
        const scenarioVariables = this.variables;
        const registeredValidations = this.responseValidation;
        const targetService = this.serviceName;
        // eslint-disable-next-line
        const expectedStatusCodes = this.expectedStatusCodes;

        const logError = (errorMessage: string): void => {
            getLogger(ctx.scenario).error(errorMessage, ctx);
        };

        const logDebug = (debugMessage: string): void => {
            getLogger(ctx.scenario).debug(debugMessage, ctx);
        };

        logDebug(`Expected status codes: ${expectedStatusCodes}`);

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
                                reject(
                                    new Error(
                                        `Header validation failed, actual headers were ${head}`,
                                    ),
                                );
                            }
                        } catch (e) {
                            logError(e.message);
                            reject(
                                new Error(
                                    `Error during header validation, actual headers were ${head}`,
                                ),
                            );
                        }
                    });
            }
        };

        const validateBody = (res: unknown): void => {
            if (registeredValidations) {
                registeredValidations
                    .filter(v => v.startsWith('res.'))
                    .forEach(validation => {
                        let validationResult;
                        try {
                            validationResult = eval(validation);
                        } catch (e) {
                            logError(e.message);
                            throw new Error(`Error parsing validation`);
                        }
                        if (validationResult) {
                            logDebug(
                                `Body validation (${validation}): ${validationResult}`,
                            );
                        } else {
                            logError(
                                `Body validation (${validation}): ${validationResult}`,
                            );
                            throw new Error(
                                `Incoming response body failed validation: (${validation})`,
                            );
                        }
                    });
            }
        };

        const generateRequestBody = (
            reject: (reason?: unknown) => void,
        ): {
            body: unknown;
            bodyForDiagram?: unknown;
        } => {
            if (this.data !== undefined) {
                const data = injectEvalAndVarsToMap(
                    this.data,
                    scenario.cache,
                    ctx,
                );
                return { body: JSON.stringify(data), bodyForDiagram: data };
            }
            if (this.dataBinary !== undefined) {
                return { body: createReadStream(this.dataBinary) };
            }
            if (this.variableAsPayload !== undefined) {
                const body = scenario.cache.get(this.variableAsPayload);
                if (
                    typeof body !== 'string' &&
                    !(body instanceof Buffer) &&
                    !(body instanceof ReadStream)
                ) {
                    reject(
                        new Error(
                            `Variable ${this.variableAsPayload} is not of type String, Buffer or ReadStream and cannot be used as payload.`,
                        ),
                    );
                    return { body: null };
                }
                return {
                    body,
                    bodyForDiagram: body,
                };
            }
            return { body: null };
        };

        const promise = new Promise((resolve, reject) => {
            const requestHeaders = this.restHead
                ? injectEvalAndVarsToMap(this.restHead, scenario.cache, ctx)
                : null;
            const requestBody = generateRequestBody(reject);
            const requestForm = this.form
                ? injectEvalAndVarsToMap(this.form, scenario.cache, ctx)
                : null;
            const baseURL = `${injectEvalAndVarsToString(
                this.url,
                scenario.cache,
                ctx,
            )}`;
            const queryParameters =
                Object.entries(this.queryParameters).length > 0
                    ? injectEvalAndVarsToMap(
                          this.queryParameters,
                          scenario.cache,
                          ctx,
                      )
                    : undefined;
            const url = queryParameters
                ? `${baseURL}?${stringify(queryParameters)}`
                : baseURL;

            const requestOptions = {
                method: this.method,
                url,
                headers: requestHeaders,
                body: requestBody.body,
                encoding: this.expectBinaryResponse ? null : undefined,
                form: requestForm,
                maxAttempts: 3,
                retryDelay: 1000, // 1s
                fullResponse: true,
                ...this.getClientCertificateConfiguration(scenario),
            };

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
                                : requestBody.body || '-'
                        }`,
                    );

                    addRequest(
                        scenario.name,
                        targetService,
                        `${response.request.method} ${response.request.path}`,
                        requestBody.bodyForDiagram,
                        this.diagramConfiguration,
                    );

                    if (expectedStatusCodes.includes(response.statusCode)) {
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
                        if (
                            response.body !== null &&
                            response.body !== undefined
                        ) {
                            const parsedResponseBody = RestAction.parseResponseBody(
                                response.body,
                                contentType,
                                ctx,
                            );

                            addSuccessfulResponseArrow(
                                scenario.name,
                                targetService,
                                `${response.statusMessage} (${response.statusCode})`,
                            );

                            try {
                                validateBody(parsedResponseBody);
                                addSuccessfulResponseBody(
                                    scenario.name,
                                    parsedResponseBody,
                                    this.diagramConfiguration,
                                );
                            } catch (e) {
                                addValidationFailureResponseBody(
                                    scenario.name,
                                    {
                                        errorMsg: e.message,
                                        responseBody: parsedResponseBody,
                                    },
                                    this.diagramConfiguration,
                                );
                                reject(e);
                            }

                            updateScenarioCache({
                                res: parsedResponseBody,
                            });
                        } else {
                            addSuccessfulResponse(
                                scenario.name,
                                targetService,
                                `${response.statusMessage} (${response.statusCode})`,
                                undefined,
                                this.diagramConfiguration,
                            );
                        }

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
                            this.diagramConfiguration,
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

    private getClientCertificateConfiguration(
        scenario: Scenario,
    ):
        | {
              cert: Buffer;
              key: Buffer;
              rejectUnauthorized: boolean;
          }
        | {} {
        const ctx = { scenario: scenario.name, action: this.name };
        try {
            const clientCertificate =
                this.clientCertificate &&
                `${injectEvalAndVarsToString(
                    this.clientCertificate,
                    scenario.cache,
                    ctx,
                )}`;
            const clientKey =
                this.clientKey &&
                `${injectEvalAndVarsToString(
                    this.clientKey,
                    scenario.cache,
                    ctx,
                )}`;
            if (clientCertificate && clientKey) {
                return {
                    cert: RestAction.readFromFileOrInput(clientCertificate),
                    key: RestAction.readFromFileOrInput(clientKey),
                    rejectUnauthorized: false,
                };
            }
        } catch (error) {
            getLogger(ctx.scenario).error(error.message, ctx);
        }
        return {};
    }

    private static readFromFileOrInput(input: string): Buffer {
        if (input.startsWith('file:')) {
            return readFileSync(input.substring(5));
        }
        return Buffer.from(input);
    }
}

export { RestAction };
