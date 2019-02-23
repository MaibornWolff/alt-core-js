import 'mocha';
import { expect } from 'chai';
import { loadAllActions } from '../actionLoading';
import { MqttPublishAction } from '../model/MqttPublishAction';

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
});
