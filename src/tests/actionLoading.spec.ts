import 'mocha';
import { expect } from 'chai';
import { loadAllActions } from '../actionLoading';
import { ActionType } from '../model/ActionType';

describe('Action loading', () => {
    const TEST_ACTION_PATH = 'src/tests/resources/actions';

    it('should be able to parse action files in the correct folder', () => {
        const envConfig = {
            'my-service': 'localhost:8080',
        };
        const result = loadAllActions(TEST_ACTION_PATH, envConfig).filter(
            a => a.name === 'restAction',
        );
        expect(result).to.have.lengthOf(1);
        expect(result[0].name).to.be.equal('restAction');
        expect(result[0].type).to.be.equal(ActionType.REST);
        expect(result[0]).to.have.property('url');
        expect(result[0]).to.have.property('method');
    });
});
