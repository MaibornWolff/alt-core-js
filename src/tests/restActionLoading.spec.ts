import 'mocha';
import {expect} from 'chai';
import {loadAllActions} from "../actionLoading";
import {ActionType} from "../model/ActionType";
import {RestAction} from "../model/RestAction";

describe('REST action loading', () => {
    
    const TEST_ACTION_DIR = 'src/tests/resources/actions'

    it('should be able to parse all relevant attributes', () => {
        const envConfig = {
            'my-service': 'localhost:8080'
        };
        const result = loadAllActions(TEST_ACTION_DIR, envConfig).find(a => a.name === 'restAction');
        expect(result.name).to.be.equal('restAction');
        expect(result.type).to.be.equal(ActionType.REST);
        expect((<RestAction>result).url).to.be.equal('https://localhost:8080/all');
        expect((<RestAction>result).serviceName).to.be.equal('my-service');
        expect((<RestAction>result).method).to.be.equal('GET');
        expect((<RestAction>result).restHead['Content-Type']).to.be.equal('application/json');
        expect((<RestAction>result).data['param']).to.be.equal('value');
        expect((<RestAction>result).dataBinary).to.be.equal('../test.txt');
        expect((<RestAction>result).form['file']).to.be.equal('example.xls');
        expect((<RestAction>result).responseValidation).to.have.lengthOf(1);
        expect((<RestAction>result).responseValidation[0]).to.be.equal('res.a === true');
        expect((<RestAction>result).variables).to.have.property('user');
        expect((<RestAction>result).variables['user']).to.be.equal('testuser');
    });
});