import { appendFileSync, createWriteStream, writeFileSync } from 'fs';
import { generate } from 'node-plantuml';
import { OUTPUT_DIR } from '.';
import { isArrayOfStrings } from './util';

export interface DiagramConfiguration {
    readonly hiddenFields?: string[];
    readonly hidePlaintext?: boolean;
}

export function isValidDiagramConfiguration(
    toBeValidated: unknown,
): toBeValidated is DiagramConfiguration {
    if (typeof toBeValidated !== 'object' || toBeValidated === null) {
        return false;
    }
    const diagramConfiguration = toBeValidated as DiagramConfiguration;

    return (
        ['boolean', 'undefined'].includes(
            typeof diagramConfiguration.hidePlaintext,
        ) &&
        (typeof diagramConfiguration.hiddenFields === 'undefined' ||
            isArrayOfStrings(diagramConfiguration.hiddenFields))
    );
}

function getInputFile(scenario: string): string {
    return `${OUTPUT_DIR()}/_${scenario}.input`;
}

function getOutputFile(scenario: string): string {
    return `${OUTPUT_DIR()}/_${scenario}.png`;
}

function objectFromEntries(arr: [string, unknown][]): object {
    return Object.assign({}, ...Array.from(arr, ([k, v]) => ({ [k]: v })));
}

function hideFields(dict: object, hiddenFields: string[]): object {
    return objectFromEntries(
        Object.entries(dict).map(([key, value]) =>
            hiddenFields.includes(key) ? [key, '***'] : [key, value],
        ),
    );
}

function applyDiagramConfiguration(
    dict: unknown,
    diagramConfiguration: DiagramConfiguration,
): unknown {
    const { hiddenFields } = diagramConfiguration;
    return typeof dict === 'object' &&
        dict !== null &&
        hiddenFields !== undefined &&
        hiddenFields.length !== 0
        ? hideFields(dict, hiddenFields)
        : dict;
}

export function extractPayload(
    dict: unknown,
    diagramConfiguration: DiagramConfiguration,
): string {
    if (Buffer.isBuffer(dict)) {
        return `binary data (${(dict as Buffer).length} bytes)`;
    }
    return JSON.stringify(
        applyDiagramConfiguration(dict, diagramConfiguration),
        null,
        1,
    );
}

function currentTimestamp(): string {
    return new Date().toISOString();
}

function enquote(str: string): string {
    return `"${str}"`;
}

export const initDiagramCreation = (scenarioId: string): void => {
    writeFileSync(getInputFile(scenarioId), '');
    const initValues = [
        '@startuml',
        'autonumber',
        'skinparam handwritten false',
        'control MQTT',
        'actor ALT #red\n',
    ];
    appendFileSync(getInputFile(scenarioId), initValues.join('\n'));
};

export const addRequest = (
    scenarioId: string,
    target: string,
    url: string,
    data: unknown,
    diagramConfiguration: DiagramConfiguration,
): void => {
    const enquotedTarget = enquote(target);
    const request = `ALT -> ${enquotedTarget}: ${url}\nactivate ${enquotedTarget}\n${
        data
            ? `note right\n**${currentTimestamp()}**\n${extractPayload(
                  data,
                  diagramConfiguration,
              )}\nend note\n`
            : ''
    }`;

    appendFileSync(getInputFile(scenarioId), request);
};

export const addSuccessfulResponse = (
    scenarioId: string,
    source: string,
    status: string,
    body: unknown,
    diagramConfiguration: DiagramConfiguration,
): void => {
    doAddResponse(scenarioId, source, status, 'green');
    if (body) {
        const note = `note left\n**${currentTimestamp()}**\n${
            typeof body === 'string'
                ? trim(body, 30)
                : extractPayload(body, diagramConfiguration)
        }\nend note\n`;
        appendFileSync(getInputFile(scenarioId), note);
    }
};

const trim = (text: string, length: number): string =>
    text.length > length ? `${text.substring(0, length - 1)}...` : text;

export const addFailedResponse = (
    scenarioId: string,
    source: string,
    status: string,
    body: string,
    diagramConfiguration: DiagramConfiguration,
): void => {
    doAddResponse(scenarioId, source, status, 'red');
    appendFileSync(
        getInputFile(scenarioId),
        `note right:  <color red>${extractPayload(
            body,
            diagramConfiguration,
        )}</color>\n||20||\n`,
    );
};

const doAddResponse = (
    scenarioId: string,
    source: string,
    status: string,
    color: string,
): void => {
    const enquotedSource = enquote(source);
    appendFileSync(
        getInputFile(scenarioId),
        `${enquotedSource} --> ALT: <color ${color}>${status}</color>\ndeactivate ${enquotedSource}\n`,
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
    payload: unknown,
    diagramConfiguration: DiagramConfiguration,
): void => {
    const enquotedSource = enquote(source);
    appendFileSync(
        getInputFile(scenarioId),
        `${enquotedSource} -[#0000FF]->o ALT : [WS]\n`,
    );
    const note = `note left #aqua\n**${currentTimestamp()}**\n${extractPayload(
        payload,
        diagramConfiguration,
    )}\nend note\n`;
    appendFileSync(getInputFile(scenarioId), note);
};

export const addMqttMessage = (
    scenarioId: string,
    topic: string,
    payload: unknown,
    diagramConfiguration: DiagramConfiguration,
): void => {
    appendFileSync(
        getInputFile(scenarioId),
        `MQTT -[#green]->o ALT : ${topic}\n`,
    );
    const note = `note right #99FF99\n**${currentTimestamp()}**\n${extractPayload(
        payload,
        diagramConfiguration,
    )}\nend note\n`;
    appendFileSync(getInputFile(scenarioId), note);
};

export const addMqttPublishMessage = (
    scenarioId: string,
    topic: string,
    payload: any,
    diagramConfiguration: DiagramConfiguration,
): void => {
    appendFileSync(
        getInputFile(scenarioId),
        `ALT -[#green]->o MQTT : ${topic}\n`,
    );
    const note = `note left #99FF99\n**${currentTimestamp()}**\n${extractPayload(
        JSON.parse(payload),
        diagramConfiguration,
    )}\nend note\n`;
    appendFileSync(getInputFile(scenarioId), note);
};

export const addAMQPReceivedMessage = (
    scenarioId: string,
    source: string,
    exchange: string,
    routingKey: string,
    payload: unknown,
    diagramConfiguration: DiagramConfiguration,
): void => {
    const enquotedSource = enquote(source);
    appendFileSync(
        getInputFile(scenarioId),
        `${enquotedSource} -[#FF6600]->o ALT : ${exchange}/${routingKey}\n`,
    );
    const note = `note left #FF6600\n**${currentTimestamp()}**\n${extractPayload(
        payload,
        diagramConfiguration,
    )}\nend note\n`;
    appendFileSync(getInputFile(scenarioId), note);
};

export const generateSequenceDiagram = (scenarioId: string): Promise<void> =>
    new Promise<void>(resolve => {
        appendFileSync(getInputFile(scenarioId), '\n@enduml');
        const gen = generate(getInputFile(scenarioId));
        gen.out.pipe(createWriteStream(getOutputFile(scenarioId)));
        gen.out.on('end', () => resolve());
    });
