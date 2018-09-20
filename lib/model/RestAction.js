"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var logging_1 = require("../logging");
var ActionType_1 = require("./ActionType");
var variableInjection_1 = require("../variableInjection");
var util_1 = require("util");
var diagramDrawing_1 = require("../diagramDrawing");
var request = require('requestretry');
var RestAction = /** @class */ (function () {
    function RestAction(name, actionDef, url, serviceName, restMethod, restHeaders, restData, restForm, validators, vars) {
        if (restMethod === void 0) { restMethod = actionDef.method; }
        if (restHeaders === void 0) { restHeaders = actionDef.headers; }
        if (restData === void 0) { restData = actionDef.data; }
        if (restForm === void 0) { restForm = actionDef.form; }
        if (validators === void 0) { validators = actionDef.responseValidation; }
        if (vars === void 0) { vars = actionDef.variables; }
        this.type = ActionType_1.ActionType.REST;
        this.name = name;
        this.url = url;
        this.serviceName = serviceName;
        this.method = restMethod;
        this.restHead = restHeaders;
        this.data = restData;
        this.form = restForm;
        this.responseValidation = validators ? [].concat(validators) : [];
        this.variables = vars;
    }
    RestAction.fromTemplate = function (actionDef, template) {
        return new RestAction(actionDef.name, actionDef, template.url, template.serviceName, actionDef.method || template.method, template.restHead ? Object.assign(Object.assign({}, template.restHead), actionDef.headers) : actionDef.restHead, this.loadData(template, actionDef), template.form ? Object.assign(Object.assign({}, template.form), actionDef.form) : null, template.responseValidation ? template.responseValidation.concat(actionDef.responseValidation || []) : actionDef.responseValidation, template.variables ? Object.assign(template.variables, actionDef.variables) : actionDef.variables);
    };
    RestAction.loadData = function (template, actionDef) {
        if (template.data) {
            if (util_1.isArray(template.data))
                return template.data.concat(actionDef.data || []);
            else
                return Object.assign(Object.assign({}, template.data), actionDef.data);
        }
        else {
            return actionDef.data;
        }
    };
    RestAction.prototype.invoke = function (scenario) {
        var _this = this;
        var ctx = { scenario: scenario.name, action: this.name };
        var scenarioVariables = this.variables;
        var registeredValidations = this.responseValidation;
        var targetService = this.serviceName;
        var logError = function (errorMessage) {
            logging_1.getLogger(ctx.scenario).error(errorMessage, ctx);
        };
        var logDebug = function (debugMessage) {
            logging_1.getLogger(ctx.scenario).debug(debugMessage, ctx);
        };
        var updateScenarioCache = function (res) {
            if (scenarioVariables) {
                for (var _i = 0, _a = Object.entries(scenarioVariables); _i < _a.length; _i++) {
                    var pair = _a[_i];
                    scenario.cache.set(pair[0], eval(pair[1]));
                    logDebug("Setting cache: " + pair[0] + " = " + scenario.cache.get(pair[0]));
                }
            }
        };
        var validateAssertions = function (res, reject) {
            if (registeredValidations) {
                registeredValidations.forEach(function (validation) {
                    try {
                        var validationResult = eval(validation);
                        if (validationResult) {
                            logDebug("Validation (" + validation + "): " + validationResult);
                        }
                        else {
                            logError("Validation (" + validation + "): " + validationResult);
                            reject(res);
                        }
                    }
                    catch (e) {
                        logError(e.message);
                        reject(res);
                    }
                });
            }
        };
        var promise = new Promise(function (resolve, reject) {
            var requestHeaders = _this.restHead ? variableInjection_1.injectVarsToMap(_this.restHead, scenario.cache, ctx) : null;
            var requestBody = _this.data ?
                util_1.isArray(_this.data) ? JSON.stringify(_this.data) : JSON.stringify(variableInjection_1.injectVarsToMap(_this.data, scenario.cache, ctx))
                :
                    null;
            var requestForm = _this.form ? variableInjection_1.injectVarsToMap(_this.form, scenario.cache, ctx) : null;
            request({
                method: _this.method,
                url: variableInjection_1.injectVarsToString(_this.url, scenario.cache, ctx),
                headers: requestHeaders,
                body: requestBody,
                form: requestForm,
                maxAttempts: 3,
                retryDelay: 1000,
                fullResponse: true
            })
                .then(function (response) {
                // console.log(response.toJSON());
                logDebug("Calling:  " + response.request.method + " " + response.request.href);
                logDebug("          " + JSON.stringify(response.request.headers));
                logDebug("          " + (requestForm ? JSON.stringify(requestForm) : requestBody || '-'));
                diagramDrawing_1.addRequest(scenario.name, targetService, response.request.method + " " + response.request.path, JSON.parse(requestBody));
                if (response.statusCode === 200) {
                    logDebug("Response: " + response.statusCode + " (" + response.statusMessage + "): " + response.body);
                    var res = void 0;
                    var contentType = response.headers['content-type'];
                    if (contentType != null) {
                        if (contentType.startsWith('application/json')) {
                            res = JSON.parse(response.body);
                        }
                        else if (contentType.startsWith('text/plain')) {
                            res = response.body;
                        }
                        else {
                            var body = [];
                            body.push(response.body);
                            res = Buffer.concat(body).toString();
                        }
                        diagramDrawing_1.addSuccessfulResponse(scenario.name, targetService, response.statusMessage + " (" + response.statusCode + ")", res);
                        validateAssertions(res, reject);
                        updateScenarioCache(res);
                    }
                    else {
                        diagramDrawing_1.addSuccessfulResponse(scenario.name, targetService, response.statusMessage + " (" + response.statusCode + ")", null);
                    }
                    return resolve();
                }
                else if (response.statusCode === 201 || response.statusCode === 204) {
                    logDebug("Response: " + response.statusCode + " (" + response.statusMessage + ")");
                    diagramDrawing_1.addSuccessfulResponse(scenario.name, targetService, response.statusMessage + " (" + response.statusCode + ")", null);
                    resolve();
                }
                else {
                    logError("Response: " + response.statusCode + " (" + response.statusMessage + ")");
                    logError("          " + response.body);
                    diagramDrawing_1.addFailedResponse(scenario.name, targetService, response.statusMessage + " (" + response.statusCode + ")", response.body);
                    reject();
                }
            })
                .catch(function (error) {
                logError("Unexpected ERROR occurred: " + error);
                return reject();
            });
        });
        return { promise: promise, cancel: function () { return console.log("TODO"); } };
    };
    return RestAction;
}());
exports.RestAction = RestAction;
