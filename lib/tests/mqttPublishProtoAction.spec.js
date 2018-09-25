"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
var chai_1 = require("chai");
var actionLoading_1 = require("../actionLoading");
describe('PROTO mqtt action loading', function () {
    var TEST_ACTION_DIR = 'src/tests/resources/actions';
    it('should be able to encode proto def correctly', function () {
        var envConfig = {
            'my-service': 'localhost:8080'
        };
        var testAction = actionLoading_1.loadAllActions(TEST_ACTION_DIR, envConfig).find(function (a) { return a.name === 'mqttPublishProtoAction'; });
        var result = testAction.encodeProtoPayload();
        chai_1.expect(result).to.be.equal('\n\u0007\n\u0005hello\u0012\u0005world');
    });
});
