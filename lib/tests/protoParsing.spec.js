"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
var chai_1 = require("chai");
var protoParsing_1 = require("../protoParsing");
describe('PROTO parsing', function () {
    var TEST_PROTO = 'src/tests/resources/proto/test.proto';
    it('can encode simple nested messages into proto buffers', function () {
        var result = protoParsing_1.encodeProto(TEST_PROTO, {
            nested: {
                nestedText: 'hello'
            },
            text: 'world'
        }, 'Test');
        chai_1.expect(result.toString('utf-8')).to.be.equal('\n\u0007\n\u0005hello\u0012\u0005world');
    });
    it('can decode proto messages into objects', function () {
        var result = protoParsing_1.decodeProto(TEST_PROTO, 'Test', new Buffer('\n\u0007\n\u0005hello\u0012\u0005world', 'utf-8'));
        chai_1.expect(result).to.have.property('nested');
        chai_1.expect(result).to.have.property('text');
        chai_1.expect(result.nested.nestedText).to.be.equal('hello');
        chai_1.expect(result.text).to.be.equal('world');
    });
});
