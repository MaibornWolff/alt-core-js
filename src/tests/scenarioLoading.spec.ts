import 'mocha';
import { expect } from 'chai';
import { loadAllScenarios, loadScenariosById } from '../scenarioLoading';
import { ActionType } from '../model/ActionType';
import { RestAction } from '../model/RestAction';

describe('Scenario loading', () => {
    const TEST_SCENARIO_PATH = 'src/tests/resources/scenarios';

    it('should be able to parse scenario files in the correct folder', () => {
        const testActionCatalog = [];
        const result = loadAllScenarios(TEST_SCENARIO_PATH, testActionCatalog);
        expect(result).to.have.lengthOf(4);
        expect(result[0]).to.have.property('description');
        expect(result[0].description).to.be.equal('test description');
        expect(result[0]).to.have.property('actions');
    });

    it('should be able to parse scenario by ID', () => {
        const testActionCatalog = [];
        const result = loadScenariosById(
            `${TEST_SCENARIO_PATH}/s1-testScenario.yaml`,
            testActionCatalog,
        );
        expect(result).to.have.lengthOf(1);
        expect(result[0]).to.have.property('description');
        expect(result[0].description).to.be.equal('test description');
        expect(result[0]).to.have.property('actions');
    });

    it('should be able to parse load scenarios by ID', () => {
        const testActionCatalog = [];
        const result = loadScenariosById(
            `${TEST_SCENARIO_PATH}/s2`,
            testActionCatalog,
        );
        expect(result).to.have.lengthOf(2);

        expect(result[0]).to.have.property('description');
        expect(result[0].description).to.be.equal('test description');
        expect(result[0]).to.have.property('actions');

        expect(result[1]).to.have.property('description');
        expect(result[1].description).to.be.equal('test description');
        expect(result[1]).to.have.property('actions');
    });

    it('should be able to parse scenario actions', () => {
        const testActionCatalog = [
            {
                name: 'do-something',
                description: null,
                type: ActionType.REST,
                invoke: null,
                invokeEvenOnFail: true,
            },
        ];
        const result = loadScenariosById(
            `${TEST_SCENARIO_PATH}/s1`,
            testActionCatalog,
        );
        expect(result[0].actions).to.have.lengthOf(1);
        expect(result[0].actions[0].name).to.be.equal('do-something');
        expect(result[0].actions[0].invokeEvenOnFail).to.be.equal(true);
    });

    it('should be able to override action simple properties', () => {
        const testActionCatalog = [
            {
                name: 'do-something',
                description: null,
                type: ActionType.REST,
                invoke: null,
                method: 'GET',
                invokeEvenOnFail: false,
            },
        ];
        const result = loadScenariosById(
            `${TEST_SCENARIO_PATH}/s1`,
            testActionCatalog,
        );
        expect(result[0].actions).to.have.lengthOf(1);
        expect((<RestAction>result[0].actions[0]).method).to.be.equal('POST');
    });

    it('should be able to override action object properties', () => {
        const testActionCatalog = [
            {
                name: 'do-something',
                description: null,
                type: ActionType.REST,
                invoke: null,
                data: {
                    userId: 1,
                },
                invokeEvenOnFail: false,
            },
        ];
        const result = loadScenariosById(
            `${TEST_SCENARIO_PATH}/s1`,
            testActionCatalog,
        );
        expect(result[0].actions).to.have.lengthOf(1);
        expect(
            (<any>(<RestAction>result[0].actions[0]).data).userId,
        ).to.be.equal(22);
    });

    it('should be able to concat action array properties', () => {
        const testActionCatalog = [
            {
                name: 'do-something',
                description: null,
                type: ActionType.REST,
                invoke: null,
                responseValidation: ['userId !== null'],
                invokeEvenOnFail: false,
            },
        ];
        const result = loadScenariosById(
            `${TEST_SCENARIO_PATH}/s1`,
            testActionCatalog,
        );
        expect(result[0].actions).to.have.lengthOf(1);
        expect(
            (<RestAction>result[0].actions[0]).responseValidation,
        ).to.have.lengthOf(2);
        expect(
            (<RestAction>result[0].actions[0]).responseValidation,
        ).to.contain('saved === true');
        expect(
            (<RestAction>result[0].actions[0]).responseValidation,
        ).to.contain('userId !== null');
    });

    it('should be able to set action´s description correctly', () => {
        const testActionCatalog = [
            {
                name: 'do-something',
                description: null,
                type: ActionType.REST,
                invoke: null,
                method: 'GET',
                invokeEvenOnFail: false,
            },
        ];
        const result = loadScenariosById(
            `${TEST_SCENARIO_PATH}/s1`,
            testActionCatalog,
        );
        expect(result[0].actions).to.have.lengthOf(1);
        expect((<RestAction>result[0].actions[0]).description).to.be.equal(
            'test something',
        );
    });
});
