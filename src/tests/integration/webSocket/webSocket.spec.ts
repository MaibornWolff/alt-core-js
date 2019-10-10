import 'mocha';
import * as WebSocket from 'ws';
import { expect } from 'chai';
import { runMultipleSceanriosWithConfigAsync } from '../../../index';

describe('WebSocket Action', () => {
    const actionDir = 'src/tests/integration/webSocket/resources/actions';
    const outDir = './out';
    const envConfigDir =
        'src/tests/integration/webSocket/resources/environment';
    const environment = 'config';

    const wss = new WebSocket.Server({ port: 8080, path: '/ws' });
    wss.on('connection', ws => {
        ws.on('message', message => {
            ws.send(message);
        });
    });

    after(() => {
        wss.close();
    });

    it('should successfully perform s1', async () => {
        const scenarioPath =
            'src/tests/integration/webSocket/resources/scenarios/s1-webSocketExpectingTheSentMessageToBeEchoed.yaml';

        const result = await runMultipleSceanriosWithConfigAsync(
            actionDir,
            outDir,
            envConfigDir,
            {
                numberOfScenariosRunInParallel: 1,
                environmentNameToBeUsed: environment,
            },
            [scenarioPath],
        );

        expect(result).to.be.equal(true);
    }).timeout(4000);

    it('should fail permorming s2', async () => {
        const scenarioPath =
            'src/tests/integration/webSocket/resources/scenarios/s2-webSocketExpectingSomethingElseThenTheSentDataToBeReceived.yaml';

        const result = await runMultipleSceanriosWithConfigAsync(
            actionDir,
            outDir,
            envConfigDir,
            {
                numberOfScenariosRunInParallel: 1,
                environmentNameToBeUsed: environment,
            },
            [scenarioPath],
        );

        expect(result).to.be.equal(false);
    }).timeout(4000);
});
