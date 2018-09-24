import 'mocha';
import {expect} from 'chai';
import {encodeProto} from "../protoParsing";

describe('PROTO parsing', () => {

    it('adsfasdfa', () => {
        const result = encodeProto('src/tests/resources/proto/test.proto', {
            Test: {
                nested: {
                    nestedText: 'hello'
                },
                text: 'world'
            }
        });
        expect(result).to.be.equal('\n\u0007\n\u0005hello\u0012\u0005world');
    });
});