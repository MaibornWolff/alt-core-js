import 'mocha';
import {expect} from 'chai';
import {encodeProto} from "../protoParsing";

describe('PROTO parsing', () => {

    it('can encode simple nested messages', () => {
        const result = encodeProto('src/tests/resources/proto/test.proto', {
            nested: {
                nestedText: 'hello'
            },
            text: 'world'
        }, 'Test');
        expect(result).to.be.equal('\n\u0007\n\u0005hello\u0012\u0005world');
    });
});