import 'mocha';
import { expect } from 'chai';
import { encodeProto, decodeProto, resolveImportPath } from '../protoParsing';

import path = require('path');

describe('PROTO parsing', () => {
    const TEST_PROTO = 'src/tests/resources/proto/test.proto';

    it('can encode simple nested messages into proto buffers', () => {
        const result = encodeProto(
            TEST_PROTO,
            {
                nested: {
                    nestedText: 'hello',
                },
                other: {
                    sometext: 'beautiful',
                },
                text: 'world',
            },
            'Test',
        );
        expect(result.toString()).to.be.equal(
            '\n\u0007\n\u0005hello\u0012\u000b\n\tbeautiful\u001a\u0005world',
        );
    });

    it('can decode proto messages into objects', () => {
        const result = decodeProto(
            TEST_PROTO,
            'Test',
            Buffer.from(
                '\n\u0007\n\u0005hello\u0012\u000b\n\tbeautiful\u001a\u0005world',
                'utf-8',
            ),
        );
        expect(result).to.have.property('nested');
        expect(result).to.have.property('text');
        expect(result.nested.nestedText).to.be.equal('hello');
        expect(result.text).to.be.equal('world');
    });

    it('can resolve relative import paths', () => {
        const result = resolveImportPath(
            TEST_PROTO,
            'resources/proto/other.proto',
        );
        expect(result).to.be.equal(
            path.resolve('src/tests/resources/proto/other.proto'),
        );
    });
});
