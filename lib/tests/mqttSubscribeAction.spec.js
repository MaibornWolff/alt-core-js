"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
var chai_1 = require("chai");
var actionLoading_1 = require("../actionLoading");
describe('MQTT Subscribe action loading', function () {
    var TEST_ACTION_DIR = 'src/tests/resources/actions';
    it('should be able to decode proto messages', function () {
        var envConfig = {
            'my-service': 'localhost:8080'
        };
        var testAction = actionLoading_1.loadAllActions(TEST_ACTION_DIR, envConfig).find(function (a) { return a.name === 'mqttSubscribeProtoAction'; });
        var result = testAction.decodeProtoPayload(new Buffer('\n\u0007\n\u0005hello\u001a\u0005world', 'utf-8'));
        chai_1.expect(result).to.eql({
            nested: {
                nestedText: 'hello'
            },
            other: null,
            text: 'world'
        });
    });
});
