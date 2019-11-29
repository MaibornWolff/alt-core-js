import 'mocha';
import { expect } from 'chai';
import { extractPayload } from '../diagramDrawing';

describe('Diagram drawing', () => {
    describe('Payload extraction', () => {
        it('should hide all fields given as hiddenFields', () => {
            // given
            const data = { foo: 'abc', bar: 1, baz: null, notHiddenField: 42 };
            const diagramConfiguration = {
                hiddenFields: ['foo', 'bar', 'baz'],
            };
            // when
            const result = extractPayload(data, diagramConfiguration);

            // then
            expect(result).to.equal(
                '{\n "foo": "***",\n "bar": "***",\n "baz": "***",\n "notHiddenField": 42\n}',
            );
        });

        it('should only output metadata for binary data (Buffers)', () => {
            // given
            const data = Buffer.from('foobarleet');
            // when
            const result = extractPayload(data, {});

            // then
            expect(result).to.equal('binary data (10 bytes)');
        });
    });
});
