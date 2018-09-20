"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
var chai_1 = require("chai");
var scenarioLoading_1 = require("../scenarioLoading");
var ActionType_1 = require("../model/ActionType");
describe('Scenario loading', function () {
    var TEST_SCENARIO_PATH = 'src/tests/resources/scenarios';
    it('should be able to parse scenario files in the correct folder', function () {
        var testActionCatalog = [];
        var result = scenarioLoading_1.loadAllScenarios(TEST_SCENARIO_PATH, testActionCatalog);
        chai_1.expect(result).to.have.lengthOf(3);
        chai_1.expect(result[0]).to.have.property('description');
        chai_1.expect(result[0].description).to.be.equal('test description');
        chai_1.expect(result[0]).to.have.property('actions');
    });
    it('should be able to parse scenario by ID', function () {
        var testActionCatalog = [];
        var result = scenarioLoading_1.loadScenariosById(TEST_SCENARIO_PATH + '/s1-testScenario.yaml', testActionCatalog);
        chai_1.expect(result).to.have.lengthOf(1);
        chai_1.expect(result[0]).to.have.property('description');
        chai_1.expect(result[0].description).to.be.equal('test description');
        chai_1.expect(result[0]).to.have.property('actions');
    });
    it('should be able to parse load scenarios by ID', function () {
        var testActionCatalog = [];
        var result = scenarioLoading_1.loadScenariosById(TEST_SCENARIO_PATH + '/s2', testActionCatalog);
        chai_1.expect(result).to.have.lengthOf(2);
        chai_1.expect(result[0]).to.have.property('description');
        chai_1.expect(result[0].description).to.be.equal('test description');
        chai_1.expect(result[0]).to.have.property('actions');
        chai_1.expect(result[1]).to.have.property('description');
        chai_1.expect(result[1].description).to.be.equal('test description');
        chai_1.expect(result[1]).to.have.property('actions');
    });
    it('should be able to parse scenario actions', function () {
        var testActionCatalog = [{ name: 'do-something', type: ActionType_1.ActionType.REST, invoke: null }];
        var result = scenarioLoading_1.loadAllScenarios(TEST_SCENARIO_PATH, testActionCatalog);
        chai_1.expect(result[0].actions).to.have.lengthOf(1);
        chai_1.expect(result[0].actions[0].name).to.be.equal('do-something');
    });
    it('should be able to override action simple properties', function () {
        var testActionCatalog = [{
                name: 'do-something',
                type: ActionType_1.ActionType.REST,
                invoke: null,
                method: 'GET'
            }];
        var result = scenarioLoading_1.loadAllScenarios(TEST_SCENARIO_PATH, testActionCatalog);
        chai_1.expect(result[0].actions).to.have.lengthOf(1);
        chai_1.expect(result[0].actions[0].method).to.be.equal('POST');
    });
    it('should be able to override action object properties', function () {
        var testActionCatalog = [{
                name: 'do-something',
                type: ActionType_1.ActionType.REST,
                invoke: null,
                data: {
                    userId: 1
                }
            }];
        var result = scenarioLoading_1.loadAllScenarios(TEST_SCENARIO_PATH, testActionCatalog);
        chai_1.expect(result[0].actions).to.have.lengthOf(1);
        chai_1.expect(result[0].actions[0].data.userId).to.be.equal(22);
    });
    it('should be able to concat action array properties', function () {
        var testActionCatalog = [{
                name: 'do-something',
                type: ActionType_1.ActionType.REST,
                invoke: null,
                responseValidation: ["userId !== null"]
            }];
        var result = scenarioLoading_1.loadAllScenarios(TEST_SCENARIO_PATH, testActionCatalog);
        chai_1.expect(result[0].actions).to.have.lengthOf(1);
        chai_1.expect(result[0].actions[0].responseValidation).to.have.lengthOf(2);
        chai_1.expect(result[0].actions[0].responseValidation).to.contain("saved === true");
        chai_1.expect(result[0].actions[0].responseValidation).to.contain("userId !== null");
    });
});
