import 'mocha';
import { expect } from 'chai';
import { URL } from 'url';
import {
    injectEvalAndVarsToMap,
    injectEvalAndVarsToString,
    injectVariableAccessAndEvaluate,
} from '../variableInjection';

describe('string injection', () => {
    it('should be able to inject vars at the end', () => {
        const variableMap = new Map();
        variableMap.set('key', 'value');
        variableMap.set('var', 'juice');
        const result = injectEvalAndVarsToString(
            '/my/url/has/some/{{var}}',
            variableMap,
            {},
        );

        expect(result).to.equal('/my/url/has/some/juice');
    });

    it('should be able to inject vars at the beginning', () => {
        const variableMap = new Map();
        variableMap.set('key', 'your');
        const result = injectEvalAndVarsToString(
            '/{{key}}/url/has/some/juice',
            variableMap,
            {},
        );

        expect(result).to.equal('/your/url/has/some/juice');
    });

    it('should be able to inject multiple vars', () => {
        const variableMap = new Map();
        variableMap.set('host', 'localhost');
        variableMap.set('live', 'true');
        const result = injectEvalAndVarsToString(
            'http://{{host}}?live={{live}}',
            variableMap,
            {},
        );

        expect(result).to.equal('http://localhost?live=true');
    });

    it('should not inject unknown vars', () => {
        const variableMap = new Map();
        const result = injectEvalAndVarsToString(
            'http://{{host}}',
            variableMap,
            {},
        );

        expect(result).to.equal('http://{{host}}');
    });

    it('should be able to inject method evaluation', () => {
        const now = Date.now();
        const result = injectEvalAndVarsToString(
            '{{{Date.now()}}}',
            new Map(),
            {},
        ).toString();
        expect(result.substr(0, 10)).to.equal(now.toString().substr(0, 10));
    });

    it('should be able to evaluate expressions with spaces in them', () => {
        const result = injectEvalAndVarsToString(
            '{{{new Date().toISOString()}}}',
            new Map(),
            {},
        ).toString();
        expect(result.substr(0, 15)).to.equal(
            new Date().toISOString().substr(0, 15),
        );
    });

    it('should be able to inject arithmetic operations into strings', () => {
        const result = injectEvalAndVarsToString(
            '"{{{5+4-3*2}}}"',
            new Map(),
            {},
        );
        expect(result).to.equal('"3"');
    });

    it('should not convert a digit-only string to a number if it does not contain a numeric-expression', () => {
        const result = injectEvalAndVarsToString('99999999', new Map(), {});
        expect(result).to.equal('99999999');
    });

    it('should be able to inject use helper methods inside expressions', () => {
        const variableMap = new Map();
        variableMap.set('v', 3);

        const resultSetGet = injectEvalAndVarsToString(
            '<<< this.set("v", 4); this.get("v") >>>',
            variableMap,
            {},
        );
        expect(resultSetGet).to.equal(4);

        const resultGetAndInc = injectEvalAndVarsToString(
            '<<< this.getAndInc("v") >>>',
            variableMap,
            {},
        );
        expect(resultGetAndInc).to.equal(4);

        const resultIncAndGet = injectEvalAndVarsToString(
            '{{{ this.incAndGet("v") }}}',
            variableMap,
            {},
        );
        expect(resultIncAndGet).to.equal('6');
    });

    it('should be able to inject multiple expressions to map', () => {
        const testMap = {
            aString: '{{{new Date().toISOString().substr(0,10)}}}',
            otherString: '{{{new Date().toISOString().substr(0,10)}}}',
            aVariable: '{{myVariable}}',
            aNumber: '<<< 1 + 2 >>>',
            nested: {
                aNestedNumber: '<<< 3 * 3 >>>',
            },
        };
        const result = injectEvalAndVarsToMap(
            testMap,
            new Map(Object.entries({ myVariable: 'myVariableValue' })),
            {},
        );
        expect(result).to.eql({
            aString: new Date().toISOString().substr(0, 10),
            otherString: new Date().toISOString().substr(0, 10),
            aVariable: 'myVariableValue',
            aNumber: 3,
            nested: {
                aNestedNumber: 9,
            },
        });
    });
});

describe('number injection', () => {
    it('should be able to evaulate arithmetic operations from string to number', () => {
        const result = injectEvalAndVarsToString(
            '<<< 5 + 4 - 3 * 2 >>>',
            new Map(),
            {},
        );
        expect(result).to.equal(3);
    });
});

describe('map injection', () => {
    it('should be able to replace simple key', () => {
        const variableMap = new Map();
        variableMap.set('host', 'localhost');
        const result = injectEvalAndVarsToMap(
            { host: '{{host}}' },
            variableMap,
            {},
        );

        expect(result.host).to.equal('localhost');
    });

    it('should be able to replace multiple occupancies of a key', () => {
        const variableMap = new Map();
        variableMap.set('host', 'localhost');
        const result = injectEvalAndVarsToMap(
            { host: '{{host}}', service: '{{host}}' },
            variableMap,
            {},
        );

        expect(result.host).to.equal('localhost');
        expect(result.service).to.equal('localhost');
    });

    it('should be able to replace multiple keys', () => {
        const variableMap = new Map();
        variableMap.set('host', 'localhost');
        variableMap.set('user', 'u123');
        const result = injectEvalAndVarsToMap(
            { host: '{{host}}', data: 'user-{{user}}' },
            variableMap,
            {},
        );

        expect(result.host).to.equal('localhost');
        expect(result.data).to.equal('user-u123');
    });

    it('should not replace unknown key', () => {
        const variableMap = new Map();
        const result = injectEvalAndVarsToMap(
            { host: '{{host}}' },
            variableMap,
            {},
        );

        expect(result.host).to.equal('{{host}}');
    });

    it('should should be able to replace nested keys', () => {
        const variableMap = new Map();
        variableMap.set('host', 'localhost');
        const result = injectEvalAndVarsToMap(
            { data: { host: '{{host}}' } },
            variableMap,
            {},
        );

        expect(result.data.host).to.equal('localhost');
    });

    it('should should be able to replace keys in arrays', () => {
        const variableMap = new Map();
        variableMap.set('host', 'localhost');
        const result = injectEvalAndVarsToMap(['{{host}}'], variableMap, {});

        expect(result[0]).to.equal('localhost');
    });

    it('should should be able to replace keys in nested arrays and objects', () => {
        const variableMap = new Map();
        variableMap.set('host', 'localhost');
        const result = injectEvalAndVarsToMap(
            [{ data: [{ host: '{{host}}' }] }],
            variableMap,
            {},
        );

        expect(result[0].data[0].host).to.equal('localhost');
    });
});

describe('variable access injection and evaluation', () => {
    it('should return the result of evaluating the given simple expression', () => {
        // given
        const expression = '"bar"';

        // when
        const result = injectVariableAccessAndEvaluate(
            expression,
            new Map<string, unknown>(),
        );

        // then
        expect(result).to.equal('bar');
    });

    it('should return the result of the last expression of the evaluated code', () => {
        // given
        const expression = '"bar"; 1; "foo";';

        // when
        const result = injectVariableAccessAndEvaluate(
            expression,
            new Map<string, unknown>(),
        );

        // then
        expect(result).to.equal('foo');
    });

    it('should return the result of evaluating the given complex expression', () => {
        // given
        const expression = 'const foo = (str) => str + ", baz"; foo("bar");';

        // when
        const result = injectVariableAccessAndEvaluate(
            expression,
            new Map<string, unknown>(),
        );

        // then
        expect(result).to.equal('bar, baz');
    });

    it('should be able to access node globals', () => {
        // given
        const expression = 'Buffer.from("bar")';

        // when
        const result = injectVariableAccessAndEvaluate(
            expression,
            new Map<string, unknown>(),
        );

        // then
        expect(result).to.eql(Buffer.from('bar'));
    });

    it('should be able to require modules', () => {
        // given
        const expression =
            'const { URL } = require("url"); new URL("http://this.is.a.test")';

        // when
        const result = injectVariableAccessAndEvaluate(
            expression,
            new Map<string, unknown>(),
        );

        // then
        expect(result).to.eql(new URL('http://this.is.a.test'));
    });

    it('should be able to access variables', () => {
        // given
        const expression = '{{aVariable}} + 41';
        const variables = new Map<string, unknown>();
        variables.set('aVariable', 1);

        // when
        const result = injectVariableAccessAndEvaluate(expression, variables);

        // then
        expect(result).to.equal(42);
    });

    it('should be able to access complex variables', () => {
        // given
        const expression = '{{aVariable}}.base64Slice()';
        const variables = new Map<string, unknown>();
        variables.set('aVariable', Buffer.from('bar'));

        // when
        const result = injectVariableAccessAndEvaluate(expression, variables);

        // then
        expect(result).to.equal('YmFy');
    });
});
