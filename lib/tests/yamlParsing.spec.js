"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
var chai_1 = require("chai");
var yamlParsing_1 = require("../yamlParsing");
describe('YAML parsing', function () {
    it('should not parse unknown files', function () {
        chai_1.expect(yamlParsing_1.loadYamlConfiguration('src/tests/image.png')).to.be.undefined;
    });
    it('should be able to parse yaml file into dict object', function () {
        var result = yamlParsing_1.loadYamlConfiguration('src/tests/resources/test.yaml');
        chai_1.expect(result).to.contain({ test: 'value' });
    });
    it('should be able to parse nested objects from yaml file', function () {
        var result = yamlParsing_1.loadYamlConfiguration('src/tests/resources/test.yaml');
        chai_1.expect(result.nested).to.contain({ key: 'nestedValue' });
        chai_1.expect(result.nested.number).to.equal(123);
    });
    it('should be able to parse arrays from yaml file', function () {
        var result = yamlParsing_1.loadYamlConfiguration('src/tests/resources/test.yaml');
        chai_1.expect(result.data).to.contain('string-1');
        chai_1.expect(result.data).to.contain('string-2');
    });
});
