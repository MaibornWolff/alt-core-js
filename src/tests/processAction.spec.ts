import 'mocha';
import { expect } from 'chai';

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
        underTest.invoke(scenario);

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
        underTest.invoke(scenario);

        // then
        expect(scenario.cache.get('foo')).to.be.equal(2);
    });
});
