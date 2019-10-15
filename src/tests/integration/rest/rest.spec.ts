import 'mocha';
import * as Http from 'http';

import { expect } from 'chai';
import { runMultipleScenariosWithConfigAsync } from '../../../index';

describe('Rest Action', () => {
    const integrationTestBasePath = 'src/tests/integration/rest/resources/';
    const actionDir = `${integrationTestBasePath}actions`;
    const outDir = './out';
    const envConfigDir = `${integrationTestBasePath}environment`;
    const environment = 'config';

    let server;

    before(() => {
        const port = 8080;

        const requestHandler = (request, response) => {
            response.setHeader('Content-Type', 'application/json');
            const responseBody = { code: 200 };
            response.end(JSON.stringify(responseBody));
        };

        server = Http.createServer(requestHandler);
        server.listen(port);
    });

    after(() => {
        server.close();
    });

    it('should successfully perform s1', async () => {
        const scenarioPath = `${integrationTestBasePath}scenarios/s1-restExpectingJsonResponseToBeValid.yaml`;

        const result = await runMultipleScenariosWithConfigAsync(
            actionDir,
            outDir,
            envConfigDir,
            {
                numberOfScenariosRunInParallel: 1,
                environmentNameToBeUsed: environment,
                drawDiagrams: false,
            },
            [scenarioPath],
        );

        expect(result).to.be.equal(true);
    });

    it('should fail perform s2', async () => {
        const scenarioPath = `${integrationTestBasePath}scenarios/s2-restExpectingJsonResponseNotToBeValid.yaml`;

        const result = await runMultipleScenariosWithConfigAsync(
            actionDir,
            outDir,
            envConfigDir,
            {
                numberOfScenariosRunInParallel: 1,
                environmentNameToBeUsed: environment,
                drawDiagrams: false,
            },
            [scenarioPath],
        );

        expect(result).to.be.equal(false);
    });
});
