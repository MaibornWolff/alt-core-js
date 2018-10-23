"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
var chai_1 = require("chai");
var variableInjection_1 = require("../variableInjection");
describe('string injection', function () {
    it('should be able to inject vars at the end', function () {
        var variableMap = new Map();
        variableMap.set('key', 'value');
        variableMap.set('var', 'juice');
        var result = variableInjection_1.injectEvalAndVarsToString('/my/url/has/some/{{var}}', variableMap, {});
        chai_1.expect(result).to.equal('/my/url/has/some/juice');
    });
    it('should be able to inject vars at the beginning', function () {
        var variableMap = new Map();
        variableMap.set('key', 'your');
        var result = variableInjection_1.injectEvalAndVarsToString('/{{key}}/url/has/some/juice', variableMap, {});
        chai_1.expect(result).to.equal('/your/url/has/some/juice');
    });
    it('should be able to inject multiple vars', function () {
        var variableMap = new Map();
        variableMap.set('host', 'localhost');
        variableMap.set('live', 'true');
        var result = variableInjection_1.injectEvalAndVarsToString('http://{{host}}?live={{live}}', variableMap, {});
        chai_1.expect(result).to.equal('http://localhost?live=true');
    });
    it('should not inject unknown vars', function () {
        var variableMap = new Map();
        var result = variableInjection_1.injectEvalAndVarsToString('http://{{host}}', variableMap, {});
        chai_1.expect(result).to.equal('http://{{host}}');
    });
    it('should be able to inject method evaluation', function () {
        var now = Date.now();
        var result = variableInjection_1.injectEvalAndVarsToString('{{{Date.now()}}}', new Map(), {}).toString();
        chai_1.expect(result.substr(0, 10)).to.equal(now.toString().substr(0, 10));
    });
    it('should be able to evaluate expressions with spaces in them', function () {
        var now = Date.now();
        var result = variableInjection_1.injectEvalAndVarsToString('{{{new Date().toISOString()}}}', new Map(), {}).toString();
        chai_1.expect(result.substr(0, 15)).to.equal(new Date().toISOString().substr(0, 15));
    });
    it('should be able to inject arithmetic operations into strings', function () {
        var result = variableInjection_1.injectEvalAndVarsToString('"{{{5+4-3*2}}}"', new Map(), {});
        chai_1.expect(result).to.equal('"3"');
    });
    it('should be able to inject multiple expressions to map', function () {
        var testMap = {
            aString: "{{{new Date().toISOString().substr(0,10)}}}",
            otherString: "{{{new Date().toISOString().substr(0,10)}}}",
            aVariable: "{{myVariable}}",
            aNumber: "<<< 1 + 2 >>>",
            nested: {
                aNestedNumber: "<<< 3 * 3 >>>"
            }
        };
        var result = variableInjection_1.injectEvalAndVarsToMap(testMap, new Map(Object.entries({ myVariable: "myVariableValue" })), {});
        chai_1.expect(result).to.eql({
            aString: new Date().toISOString().substr(0, 10),
            otherString: new Date().toISOString().substr(0, 10),
            aVariable: "myVariableValue",
            aNumber: 3,
            nested: {
                aNestedNumber: 9
            }
        });
    });
});
describe('number injection', function () {
    it('should be able to evaulate arithmetic operations from string to number', function () {
        var result = variableInjection_1.injectEvalAndVarsToString('<<< 5 + 4 - 3 * 2 >>>', new Map(), {});
        chai_1.expect(result).to.equal(3);
    });
});
describe('map injection', function () {
    it('should be able to replace simple key', function () {
        var variableMap = new Map();
        variableMap.set('host', 'localhost');
        var result = variableInjection_1.injectEvalAndVarsToMap({ host: '{{host}}' }, variableMap, {});
        chai_1.expect(result['host']).to.equal('localhost');
    });
    it('should be able to replace multiple occupancies of a key', function () {
        var variableMap = new Map();
        variableMap.set('host', 'localhost');
        var result = variableInjection_1.injectEvalAndVarsToMap({ host: '{{host}}', service: '{{host}}' }, variableMap, {});
        chai_1.expect(result['host']).to.equal('localhost');
        chai_1.expect(result['service']).to.equal('localhost');
    });
    it('should be able to replace multiple keys', function () {
        var variableMap = new Map();
        variableMap.set('host', 'localhost');
        variableMap.set('user', 'u123');
        var result = variableInjection_1.injectEvalAndVarsToMap({ host: '{{host}}', data: 'user-{{user}}' }, variableMap, {});
        chai_1.expect(result['host']).to.equal('localhost');
        chai_1.expect(result['data']).to.equal('user-u123');
    });
    it('should not replace unknown key', function () {
        var variableMap = new Map();
        var result = variableInjection_1.injectEvalAndVarsToMap({ host: '{{host}}' }, variableMap, {});
        chai_1.expect(result['host']).to.equal('{{host}}');
    });
});
