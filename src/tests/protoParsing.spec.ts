import { expect } from 'chai';
import 'mocha';
import { resolve } from 'path';
import {
    decodeProto,
    encodeProto,
    resolveImportPath,
    encodeProtoWithEncoding,
} from '../protoParsing';

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
        expect(
            result.nested &&
                (result.nested as { nestedText: string }).nestedText,
        ).to.be.equal('hello');
        expect(result.text).to.be.equal('world');
    });

    it('can resolve relative import paths', () => {
        const result = resolveImportPath(
            TEST_PROTO,
            'resources/proto/other.proto',
        );
        expect(result).to.be.equal(
            resolve('src/tests/resources/proto/other.proto'),
        );
    });

    it('can encode simple nested messages into proto buffers base64 encoded', () => {
        const result = encodeProtoWithEncoding(
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
            'base64',
        );
        expect(result).to.be.equal('CgcKBWhlbGxvEgsKCWJlYXV0aWZ1bBoFd29ybGQ=');
    });
});
