import 'mocha';
import {expect} from 'chai';
import {loadAllActions} from "../actionLoading";
import { MqttPublishAction } from '../model/MqttPublishAction';

describe('MQTT Publish action loading', () => {
    
    const TEST_ACTION_DIR = 'src/tests/resources/actions'

    it('should be able to encode proto messages', () => {
        const envConfig = {
            'my-service': 'localhost:8080'
        };
        let testAction: MqttPublishAction = loadAllActions(TEST_ACTION_DIR, envConfig).find(a => a.name === 'mqttPublishProtoAction') as MqttPublishAction;
        let result = testAction.encodeProtoPayload();
        expect(result.toString('utf-8')).to.be.equal('\n\u0007\n\u0005hello\u001a\u0005world');
    });
});