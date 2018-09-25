"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
var chai_1 = require("chai");
var actionLoading_1 = require("../actionLoading");
var ActionType_1 = require("../model/ActionType");
describe('Action loading', function () {
    var TEST_ACTION_PATH = 'src/tests/resources/actions';
    it('should be able to parse action files in the correct folder', function () {
        var envConfig = {
            'my-service': 'localhost:8080'
        };
        var result = actionLoading_1.loadAllActions(TEST_ACTION_PATH, envConfig).filter(function (a) { return a.name === 'restAction'; });
        chai_1.expect(result).to.have.lengthOf(1);
        chai_1.expect(result[0].name).to.be.equal('restAction');
        chai_1.expect(result[0].type).to.be.equal(ActionType_1.ActionType.REST);
        chai_1.expect(result[0]).to.have.property('url');
        chai_1.expect(result[0]).to.have.property('method');
    });
});
