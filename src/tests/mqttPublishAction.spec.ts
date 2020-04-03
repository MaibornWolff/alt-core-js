import 'mocha';
import { expect } from 'chai';
import { loadAllActions } from '../actionLoading';
import { MqttPublishAction } from '../model/MqttPublishAction';
import { Scenario } from '../model/Scenario';

describe('MQTT Publish action loading', () => {
    const TEST_ACTION_DIR = 'src/tests/resources/actions';

    it('should be able to encode proto messages', () => {
        const envConfig = {
            'my-service': 'localhost:8080',
        };
        const testAction: MqttPublishAction = loadAllActions(
            TEST_ACTION_DIR,
            envConfig,
        ).find(a => a.name === 'mqttPublishProtoAction') as MqttPublishAction;
        const [result] = testAction.encodeProtoPayload(new Map());
        expect(result.toString()).to.be.equal(
            '\n\u0007\n\u0005hello\u001a\u0005world',
        );
    });

    // TODO: Enable scenario invocation to stop for test
    /* it('should be able to evaluate variables', async () => {
        const envConfig = {
            'my-service': 'localhost:8080',
        };
        const testAction: MqttPublishAction = loadAllActions(
            TEST_ACTION_DIR,
            envConfig,
        ).find(a => a.name === 'mqttPublishProtoAction_with_variables') as MqttPublishAction;
        
        const scenario = new Scenario('', { actions: [] }, [], []);

        scenario.cache.set('username', 'test');

        // when
        await testAction.invoke(scenario).promise;

        // then
        expect(scenario.cache.get('username')).to.be.equal('test');
    }); */
});
