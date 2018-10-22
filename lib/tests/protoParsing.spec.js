"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
var chai_1 = require("chai");
var protoParsing_1 = require("../protoParsing");
var path = require("path");
describe('PROTO parsing', function () {
    var TEST_PROTO = 'src/tests/resources/proto/test.proto';
    it('can encode simple nested messages into proto buffers', function () {
        var result = protoParsing_1.encodeProto(TEST_PROTO, {
            nested: {
                nestedText: 'hello'
            },
            other: {
                sometext: 'beautiful'
            },
            text: 'world'
        }, 'Test');
        chai_1.expect(result.toString()).to.be.equal('\n\u0007\n\u0005hello\u0012\u000b\n\tbeautiful\u001a\u0005world');
    });
    it('can decode proto messages into objects', function () {
        var result = protoParsing_1.decodeProto(TEST_PROTO, 'Test', Buffer.from('\n\u0007\n\u0005hello\u0012\u000b\n\tbeautiful\u001a\u0005world', 'utf-8'));
        chai_1.expect(result).to.have.property('nested');
        chai_1.expect(result).to.have.property('text');
        chai_1.expect(result.nested.nestedText).to.be.equal('hello');
        chai_1.expect(result.text).to.be.equal('world');
    });
    it('can resolve relative import paths', function () {
        var result = protoParsing_1.resolveImportPath(TEST_PROTO, "resources/proto/other.proto");
        chai_1.expect(result).to.be.equal(path.resolve("src/tests/resources/proto/other.proto"));
    });
});
