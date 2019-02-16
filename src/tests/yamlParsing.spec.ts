import { expect } from 'chai';
import 'mocha';
import { loadYamlConfiguration } from '../yamlParsing';

describe('YAML parsing', () => {

    it('should not parse unknown files', () => {
        expect(loadYamlConfiguration('src/tests/image.png')).to.be.undefined;
    });

    it('should be able to parse yaml file into dict object', () => {
        const result = loadYamlConfiguration('src/tests/resources/test.yaml');
        expect(result).to.contain({test: 'value'});
    });

    it('should be able to parse nested objects from yaml file', () => {
        const result = loadYamlConfiguration('src/tests/resources/test.yaml');
        expect(result.nested).to.contain({key: 'nestedValue'});
        expect(result.nested.number).to.equal(123);
    });

    it('should be able to parse arrays from yaml file', () => {
        const result = loadYamlConfiguration('src/tests/resources/test.yaml');
        expect(result.data).to.contain('string-1');
        expect(result.data).to.contain('string-2');
    });
});