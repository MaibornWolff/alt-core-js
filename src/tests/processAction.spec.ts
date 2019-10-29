import 'mocha';
import { expect } from 'chai';
import { URL } from 'url';

import { ProcessAction } from '../model/ProcessAction';
import { Scenario } from '../model/Scenario';

describe('process action', () => {
    it('should assign a constant expression to the given variable', async () => {
        // given
        const underTest = new ProcessAction('processAction', {
            type: 'PROCESS',
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
        const underTest = new ProcessAction('processAction', {
            type: 'PROCESS',
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
        const underTest = new ProcessAction('processAction', {
            type: 'PROCESS',
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
        const underTest = new ProcessAction('processAction', {
            type: 'PROCESS',
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
        const underTest = new ProcessAction('processAction', {
            type: 'PROCESS',
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
        const underTest = new ProcessAction('processAction', {
            type: 'PROCESS',
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
});
