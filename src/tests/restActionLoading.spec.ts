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
        const resultAsRestAction = result as RestAction;

        expect((result as RestAction).url).to.be.equal(
            'https://localhost:8080/all',
        );
        expect(resultAsRestAction.serviceName).to.be.equal('my-service');
        expect(resultAsRestAction.method).to.be.equal('GET');
        expect(resultAsRestAction.queryParameters).to.deep.equal({
            size: 9,
            filter: '{{age}}',
        });
        expect(
            resultAsRestAction.restHead &&
                resultAsRestAction.restHead['Content-Type'],
        ).to.be.equal('application/json');
        expect(
            resultAsRestAction.data && resultAsRestAction.data[param],
        ).to.be.equal('value');
        expect(resultAsRestAction.dataBinary).to.be.equal('../test.txt');
        expect(
            resultAsRestAction.form && resultAsRestAction.form[file],
        ).to.be.equal('example.xls');
        expect(resultAsRestAction.responseValidation).to.have.lengthOf(1);
        expect(
            resultAsRestAction.responseValidation &&
                resultAsRestAction.responseValidation[0],
        ).to.be.equal('res.a === true');
        expect(resultAsRestAction.variables).to.have.property('user');
        expect(
            resultAsRestAction.variables && resultAsRestAction.variables[user],
        ).to.be.equal('testuser');
        expect(resultAsRestAction.clientCertificate).to.be.equal(
            'file:../clientCertificate.pem',
        );
        expect(resultAsRestAction.clientKey).to.be.equal(
            'file:../clientKey.pem',
        );
    });
});
