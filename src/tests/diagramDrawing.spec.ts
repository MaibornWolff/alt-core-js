import 'mocha';
import { expect } from 'chai';
import { formatPayload } from '../diagramDrawing/diagramDrawing';

describe('Diagram drawing', () => {
    describe('Payload formatting', () => {
        it('should hide all fields given as hiddenFields', () => {
            // given
            const data = { foo: 'abc', bar: 1, baz: null, notHiddenField: 42 };
            const diagramConfiguration = {
                hiddenFields: ['foo', 'bar', 'baz'],
            };

            // when
            const result = formatPayload(data, diagramConfiguration);

            // then
            expect(result).to.equal(
                '{\n "foo": "***",\n "bar": "***",\n "baz": "***",\n "notHiddenField": 42\n}',
            );
        });

        it('should only output metadata for binary data (Buffers)', () => {
            // given
            const data = Buffer.from('foobarleet');

            // when
            const result = formatPayload(data, {});

            // then
            expect(result).to.equal('binary data (10 bytes)');
        });

        it('should not trim plaintext if it isnot too long', () => {
            // given
            const data = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

            // when
            const result = formatPayload(data, {});

            // then
            expect(result).to.equal('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
        });

        it('should trim plaintext if it is too long', () => {
            // given
            const data = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

            // when
            const result = formatPayload(data, {});

            // then
            expect(result).to.equal('aaaaaaaaaaaaaaaaaaaaaaaaaaa...');
        });

        it('should hide plaintext if configured to', () => {
            // given
            const data = 'abcdefg';

            // when
            const result = formatPayload(data, { hidePlaintext: true });

            // then
            expect(result).to.equal('***');
        });
    });
});
