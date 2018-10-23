import 'mocha';
import {expect} from 'chai';
import {injectVarsToMap, injectVarsToString, injectEvaluationToString, injectEvaluationToNumber, injectEvaluationToMap} from "../variableInjection";

describe('string injection', () => {

    it('should be able to inject vars at the end', () => {
        const variableMap = new Map();
        variableMap.set('key', 'value');
        variableMap.set('var', 'juice');
        const result = injectVarsToString('/my/url/has/some/{{var}}', variableMap, {});

        expect(result).to.equal('/my/url/has/some/juice');
    });

    it('should be able to inject vars at the beginning', () => {
        const variableMap = new Map();
        variableMap.set('key', 'your');
        const result = injectVarsToString('/{{key}}/url/has/some/juice', variableMap, {});

        expect(result).to.equal('/your/url/has/some/juice');
    });

    it('should be able to inject multiple vars', () => {
        const variableMap = new Map();
        variableMap.set('host', 'localhost');
        variableMap.set('live', 'true');
        const result = injectVarsToString('http://{{host}}?live={{live}}', variableMap, {});

        expect(result).to.equal('http://localhost?live=true');
    });

    it('should not inject unknown vars', () => {
        const variableMap = new Map();
        const result = injectVarsToString('http://{{host}}', variableMap, {});

        expect(result).to.equal('http://{{host}}');
    });

    it('should be able to inject method evaluation', () => {
        let now = Date.now();
        const result = injectEvaluationToString('{{{Date.now()}}}', {}, new Map());
        expect(result.substr(0, 10)).to.equal(now.toString().substr(0, 10));      
    });
    
    it('should be able to evaluate expressions with spaces in them', () => {
        let now = Date.now();
        const result = injectEvaluationToString('{{{new Date().toISOString()}}}', {}, new Map());
        expect(result.substr(0, 15)).to.equal(new Date().toISOString().substr(0, 15));      
    });

    it('should be able to inject arithmetic operations into strings', () => {
        const result = injectEvaluationToString('"{{{5+4-3*2}}}"', {}, new Map());
        expect(result).to.equal('"3"');      
    });

    it('should be able to inject multiple expressions to map', () => {
        let testMap = {
            aString: "{{{new Date().toISOString().substr(0,10)}}}",
            otherString: "{{{new Date().toISOString().substr(0,10)}}}",
            aNumber: "<<< 1 + 2 >>>"
        }
        const result = injectEvaluationToMap(testMap, {}, new Map());
        expect(result).to.eql({
            aString: new Date().toISOString().substr(0,10),
            otherString: new Date().toISOString().substr(0,10),
            aNumber: 3
        });      
    });
});

describe('number injection', () => {

    it('should be able to evaulate arithmetic operations from string to number', () => {
        const result = injectEvaluationToNumber('"<<< 5 + 4 - 3 * 2 >>>"', {}, new Map());
        expect(result).to.equal('3');
    });
});

describe('map injection', () => {

    it('should be able to replace simple key', () => {
        const variableMap = new Map();
        variableMap.set('host', 'localhost');
        const result = injectVarsToMap({host: '{{host}}'}, variableMap, {});

        expect(result['host']).to.equal('localhost');
    });

    it('should be able to replace multiple occupancies of a key', () => {
        const variableMap = new Map();
        variableMap.set('host', 'localhost');
        const result = injectVarsToMap({host: '{{host}}', service: '{{host}}'}, variableMap, {});

        expect(result['host']).to.equal('localhost');
        expect(result['service']).to.equal('localhost');
    });

    it('should be able to replace multiple keys', () => {
        const variableMap = new Map();
        variableMap.set('host', 'localhost');
        variableMap.set('user', 'u123');
        const result = injectVarsToMap({host: '{{host}}', data: 'user-{{user}}'}, variableMap, {});

        expect(result['host']).to.equal('localhost');
        expect(result['data']).to.equal('user-u123');
    });

    it('should not replace unknown key', () => {
        const variableMap = new Map();
        const result = injectVarsToMap({host: '{{host}}'}, variableMap, {});

        expect(result['host']).to.equal('{{host}}');
    });

});