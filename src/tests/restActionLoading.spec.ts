import 'mocha';
import { expect } from 'chai';
import { loadAllActions } from '../actionLoading';
import { ActionType } from '../model/ActionType';
import { RestAction } from '../model/RestAction';

describe('REST action loading', () => {
    const TEST_ACTION_DIR = 'src/tests/resources/actions';

    it('should be able to parse all relevant attributes', () => {
        const envConfig = {
            'my-service': 'localhost:8080',
        };
        const result = loadAllActions(TEST_ACTION_DIR, envConfig).find(
            a => a.name === 'restAction',
        );
        const param = 'param';
        const user = 'user';
        const file = 'file';
        expect(result).to.exist;
        expect(result && result.name).to.be.equal('restAction');
        expect(result && result.type).to.be.equal(ActionType.REST);
        expect((result as RestAction).url).to.be.equal(
            'https://localhost:8080/all',
        );
        expect((result as RestAction).serviceName).to.be.equal('my-service');
        expect((result as RestAction).method).to.be.equal('GET');
        expect((result as RestAction).queryParameters).to.deep.equal({
            size: 9,
            filter: '{{age}}',
        });
        expect((result as RestAction).restHead['Content-Type']).to.be.equal(
            'application/json',
        );
        expect((result as RestAction).data[param]).to.be.equal('value');
        expect((result as RestAction).dataBinary).to.be.equal('../test.txt');
        expect((result as RestAction).form[file]).to.be.equal('example.xls');
        expect((result as RestAction).responseValidation).to.have.lengthOf(1);
        expect((result as RestAction).responseValidation[0]).to.be.equal(
            'res.a === true',
        );
        expect((result as RestAction).variables).to.have.property('user');
        expect((result as RestAction).variables[user]).to.be.equal('testuser');
    });
});
