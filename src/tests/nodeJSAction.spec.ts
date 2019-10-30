import 'mocha';
import { expect, use } from 'chai';
import { URL } from 'url';
import * as chaiAsPromised from 'chai-as-promised';
import { NodeJSAction } from '../model/NodeJSAction';
import { Scenario } from '../model/Scenario';

use(chaiAsPromised);

describe('Node.js action', () => {
    it('should assign a constant expression to the given variable', async () => {
        // given
        const underTest = new NodeJSAction('nodeJSAction', {
            type: 'NODE_JS',
            variables: { foo: '"bar"' },
        });

        const scenario = new Scenario('', { actions: [] }, [], []);

        // when
        await underTest.invoke(scenario).promise;

        // then
        expect(scenario.cache.get('foo')).to.be.equal('bar');
    });

    it('should assign the result of a simple calculation to the given variable', async () => {
        // given
        const underTest = new NodeJSAction('nodeJSAction', {
            type: 'NODE_JS',
            variables: { foo: '1 + 1' },
        });

        const scenario = new Scenario('', { actions: [] }, [], []);

        // when
        await underTest.invoke(scenario).promise;

        // then
        expect(scenario.cache.get('foo')).to.be.equal(2);
    });

    it('should use the scenario variable in a simple expression', async () => {
        // given
        const underTest = new NodeJSAction('nodeJSAction', {
            type: 'NODE_JS',
            variables: { foo: '1 + {{increment}}' },
        });

        const scenario = new Scenario('', { actions: [] }, [], []);

        scenario.cache.set('increment', 1);

        // when
        await underTest.invoke(scenario).promise;

        // then
        expect(scenario.cache.get('foo')).to.be.equal(2);
    });

    it('should use all scenario variables referenced in the given expression', async () => {
        // given
        const underTest = new NodeJSAction('nodeJSAction', {
            type: 'NODE_JS',
            variables: {
                foo:
                    '1 + {{increment}} + {{anotherIncrement}} + {{yetAnotherIncrement}}',
            },
        });

        const scenario = new Scenario('', { actions: [] }, [], []);

        scenario.cache.set('increment', 1);
        scenario.cache.set('anotherIncrement', 33);
        scenario.cache.set('yetAnotherIncrement', 7);

        // when
        await underTest.invoke(scenario).promise;

        // then
        expect(scenario.cache.get('foo')).to.be.equal(42);
    });

    it("should be able to access node's default globals", async () => {
        // given
        const underTest = new NodeJSAction('nodeJSAction', {
            type: 'NODE_JS',
            variables: {
                foo: 'Buffer.from("bar")',
            },
        });

        const scenario = new Scenario('', { actions: [] }, [], []);

        // when
        await underTest.invoke(scenario).promise;

        // then
        expect(scenario.cache.get('foo')).to.be.eql(Buffer.from('bar'));
    });

    it('should be able to require modules in expressions', async () => {
        // given
        const underTest = new NodeJSAction('nodeJSAction', {
            type: 'NODE_JS',
            variables: {
                foo: `const { URL } = require("url"); new URL("http://this.is.a.test")`,
            },
        });

        const scenario = new Scenario('', { actions: [] }, [], []);

        // when
        await underTest.invoke(scenario).promise;

        // then
        expect(scenario.cache.get('foo')).to.be.eql(
            new URL('http://this.is.a.test'),
        );
    });

    it('should be able to set several variables', async () => {
        // given
        const underTest = new NodeJSAction('nodeJSAction', {
            type: 'NODE_JS',
            variables: {
                foo: '"bar"',
                baz: '42',
            },
        });

        const scenario = new Scenario('', { actions: [] }, [], []);

        // when
        await underTest.invoke(scenario).promise;

        // then
        expect(scenario.cache.get('foo')).to.be.equal('bar');
        expect(scenario.cache.get('baz')).to.be.equal(42);
    });

    it('should fail if one of the expressions throws', async () => {
        // given
        const underTest = new NodeJSAction('nodeJSAction', {
            type: 'NODE_JS',
            variables: {
                foo: 'throw new Error("foo")',
            },
        });

        const scenario = new Scenario('', { actions: [] }, [], []);

        // when
        const result = underTest.invoke(scenario).promise;

        // then
        await expect(result).to.be.rejectedWith('foo');
    });

    it('should fail if one of the expressions is invalid syntax', async () => {
        // given
        const underTest = new NodeJSAction('nodeJSAction', {
            type: 'NODE_JS',
            variables: {
                foo: '"',
            },
        });

        const scenario = new Scenario('', { actions: [] }, [], []);

        // when
        const result = underTest.invoke(scenario).promise;

        // then
        await expect(result).to.be.rejectedWith('Invalid or unexpected token');
    });
});
