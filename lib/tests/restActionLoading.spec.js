"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
var chai_1 = require("chai");
var actionLoading_1 = require("../actionLoading");
var ActionType_1 = require("../model/ActionType");
describe('REST action loading', function () {
    var TEST_ACTION_DIR = 'src/tests/resources/actions';
    it('should be able to parse all relevant attributes', function () {
        var envConfig = {
            'my-service': 'localhost:8080'
        };
        var result = actionLoading_1.loadAllActions(TEST_ACTION_DIR, envConfig).find(function (a) { return a.name === 'restAction'; });
        chai_1.expect(result.name).to.be.equal('restAction');
        chai_1.expect(result.type).to.be.equal(ActionType_1.ActionType.REST);
        chai_1.expect(result.url).to.be.equal('https://localhost:8080/all');
        chai_1.expect(result.serviceName).to.be.equal('my-service');
        chai_1.expect(result.method).to.be.equal('GET');
        chai_1.expect(result.restHead['Content-Type']).to.be.equal('application/json');
        chai_1.expect(result.data['param']).to.be.equal('value');
        chai_1.expect(result.dataBinary).to.be.equal('../test.txt');
        chai_1.expect(result.form['file']).to.be.equal('example.xls');
        chai_1.expect(result.responseValidation).to.have.lengthOf(1);
        chai_1.expect(result.responseValidation[0]).to.be.equal('res.a === true');
        chai_1.expect(result.variables).to.have.property('user');
        chai_1.expect(result.variables['user']).to.be.equal('testuser');
    });
});
