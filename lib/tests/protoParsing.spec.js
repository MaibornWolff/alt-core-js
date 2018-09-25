"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
var chai_1 = require("chai");
var protoParsing_1 = require("../protoParsing");
describe('PROTO parsing', function () {
    it('can encode simple nested messages', function () {
        var result = protoParsing_1.encodeProto('src/tests/resources/proto/test.proto', {
            nested: {
                nestedText: 'hello'
            },
            text: 'world'
        }, 'Test');
        chai_1.expect(result).to.be.equal('\n\u0007\n\u0005hello\u0012\u0005world');
    });
});
