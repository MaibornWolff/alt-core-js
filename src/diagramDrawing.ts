import { appendFileSync, createWriteStream, writeFileSync } from 'fs';
import { generate } from 'node-plantuml';
import { OUTPUT_DIR } from '.';

function getInputFile(scenario: string): string {
    return `${OUTPUT_DIR()}/_${scenario}.input`;
}

function getOutputFile(scenario: string): string {
    return `${OUTPUT_DIR()}/_${scenario}.png`;
}

function extractPayload(dict: any): string {
    return JSON.stringify(dict, null, 1);
}

function currentTimestamp(): string {
    return new Date().toISOString();
}

function replaceDashes(str: string): string {
    return str.replace(new RegExp('-', 'g'), '_');
}

export const initDiagramCreation = (scenarioId: string): void => {
    writeFileSync(getInputFile(scenarioId), '');
    const initValues = [
        '@startuml',
        'autonumber',
        'skinparam handwritten false',
        'control MQTT',
        'actor YATF #red\n',
    ];
    appendFileSync(getInputFile(scenarioId), initValues.join('\n'));
};

export const addRequest = (
    scenarioId: string,
    target: string,
    url: string,
    data: any,
): void => {
    const targetWithUnderscores = replaceDashes(target);
    const request = `YATF -> ${targetWithUnderscores}: ${url}\nactivate ${targetWithUnderscores}\n${
        data
            ? `note right\n**${currentTimestamp()}**\n${extractPayload(
                  data,
              )}\nend note\n`
            : ''
    }`;

    appendFileSync(getInputFile(scenarioId), request);
};

export const addSuccessfulResponse = (
    scenarioId: string,
    source: string,
    status: string,
    body?: string,
): void => {
    doAddResponse(scenarioId, source, status, 'green');
    if (body) {
        const note = `note left\n**${currentTimestamp()}**\n${
            typeof body === 'object' ? extractPayload(body) : body.substr(0, 30)
        }\nend note\n`;
        appendFileSync(getInputFile(scenarioId), note);
    }
};

export const addFailedResponse = (
    scenarioId: string,
    source: string,
    status: string,
    body: string,
): void => {
    doAddResponse(scenarioId, source, status, 'red');
    appendFileSync(
        getInputFile(scenarioId),
        `note right:  <color red>${body}</color>\n||20||\n`,
    );
};

const doAddResponse = (
    scenarioId: string,
    source: string,
    status: string,
    color: string,
): void => {
    const sourceWithUnderscores = replaceDashes(source);
    appendFileSync(
        getInputFile(scenarioId),
        `${sourceWithUnderscores} --> YATF: <color ${color}>${status}</color>\ndeactivate ${sourceWithUnderscores}\n`,
    );
};

export const addDelay = (scenarioId: string, durationInSec: number): void => {
    appendFileSync(
        getInputFile(scenarioId),
        `\n...sleep ${durationInSec} s...\n`,
    );
};

export const addWsMessage = (
    scenarioId: string,
    source: string,
    payload: any,
): void => {
    const sourceWithUnderscores = replaceDashes(source);
    appendFileSync(
        getInputFile(scenarioId),
        `${sourceWithUnderscores} -[#0000FF]->o YATF : [WS]\n`,
    );
    const note = `note left #aqua\n**${currentTimestamp()}**\n${extractPayload(
        payload,
    )}\nend note\n`;
    appendFileSync(getInputFile(scenarioId), note);
};

export const addMqttMessage = (
    scenarioId: string,
    topic: string,
    payload: any,
): void => {
    appendFileSync(
        getInputFile(scenarioId),
        `MQTT -[#green]->o YATF : ${topic}\n`,
    );
    const note = `note right #99FF99\n**${currentTimestamp()}**\n${extractPayload(
        payload,
    )}\nend note\n`;
    appendFileSync(getInputFile(scenarioId), note);
};

export const addMqttPublishMessage = (
    scenarioId: string,
    topic: string,
    payload: any,
): void => {
    appendFileSync(
        getInputFile(scenarioId),
        `YATF -[#green]->o MQTT : ${topic}\n`,
    );
    const note = `note left #99FF99\n**${currentTimestamp()}**\n${extractPayload(
        JSON.parse(payload),
    )}\nend note\n`;
    appendFileSync(getInputFile(scenarioId), note);
};

export const addAMQPReceivedMessage = (
    scenarioId: string,
    source: string,
    exchange: string,
    routingKey: string,
    payload: unknown,
): void => {
    const sourceWithUnderscores = replaceDashes(source);
    appendFileSync(
        getInputFile(scenarioId),
        `${sourceWithUnderscores} -[#cyan]->o YATF : ${exchange}/${routingKey}\n`,
    );
    const note = `note right #cyan\n**${currentTimestamp()}**\n${extractPayload(
        payload,
    )}\nend note\n`;
};

export const generateSequenceDiagram = (scenarioId: string): Promise<void> =>
    new Promise<void>(resolve => {
        appendFileSync(getInputFile(scenarioId), '\n@enduml');
        const gen = generate(getInputFile(scenarioId));
        gen.out.pipe(createWriteStream(getOutputFile(scenarioId)));
        gen.out.on('end', () => resolve());
    });
