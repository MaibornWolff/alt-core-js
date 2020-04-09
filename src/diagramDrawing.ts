import { appendFileSync, createWriteStream, writeFileSync } from 'fs';
import { generate } from 'node-plantuml';
import { OUTPUT_DIR } from '.';
import { isArrayOfStrings, objectFromEntries, trim } from './util';

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

const hidingText = '***';

function hideFields(payload: object, hiddenFields: string[]): object {
    return objectFromEntries(
        Object.entries(payload).map(([key, value]) =>
            hiddenFields.includes(key) ? [key, hidingText] : [key, value],
        ),
    );
}

function hideFieldsIfNeeded(
    payload: unknown,
    hiddenFields?: string[],
): unknown {
    return typeof payload === 'object' &&
        payload !== null &&
        hiddenFields !== undefined &&
        hiddenFields.length !== 0
        ? hideFields(payload, hiddenFields)
        : payload;
}

function hidePlaintextIfNeeded(payload: string, hidePlaintext = false): string {
    return hidePlaintext ? hidingText : payload;
}

function formatBinaryPayload(payload: Buffer): string {
    return `binary data (${(payload as Buffer).length} bytes)`;
}

function formatPlaintextPayload(
    payload: string,
    diagramConfiguration: DiagramConfiguration,
): string {
    return trim(
        hidePlaintextIfNeeded(payload, diagramConfiguration.hidePlaintext),
        30,
    );
}

function formatObjectPayload(
    payload: unknown,
    diagramConfiguration: DiagramConfiguration,
): string {
    return JSON.stringify(
        hideFieldsIfNeeded(payload, diagramConfiguration.hiddenFields),
        null,
        1,
    );
}

export function formatPayload(
    payload: unknown,
    diagramConfiguration: DiagramConfiguration,
): string {
    if (Buffer.isBuffer(payload)) {
        return formatBinaryPayload(payload);
    }
    if (typeof payload === 'string') {
        return formatPlaintextPayload(payload, diagramConfiguration);
    }
    return formatObjectPayload(payload, diagramConfiguration);
}

function currentTimestamp(): string {
    return new Date().toISOString();
}

function quote(str: string): string {
    return `"${str}"`;
}

export const initDiagramCreation = (scenarioId: string): void => {
    writeFileSync(getInputFile(scenarioId), '');
    const initValues = [
        '@startuml',
        'autonumber',
        'skinparam handwritten false',
        'control MQTT',
        'control AMQP',
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
    const enquotedTarget = quote(target);
    const request = `ALT -> ${enquotedTarget}: ${url}\nactivate ${enquotedTarget}\n${
        data
            ? `note right\n**${currentTimestamp()}**\n${formatPayload(
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
        const note = `note left\n**${currentTimestamp()}**\n${formatPayload(
            body,
            diagramConfiguration,
        )}\nend note\n`;
        appendFileSync(getInputFile(scenarioId), note);
    }
};

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
        `note right:  <color red>${formatPayload(
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
    const enquotedSource = quote(source);
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
    const enquotedSource = quote(source);
    appendFileSync(
        getInputFile(scenarioId),
        `${enquotedSource} -[#0000FF]->o ALT : [WS]\n`,
    );
    const note = `note left #aqua\n**${currentTimestamp()}**\n${formatPayload(
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
    const note = `note right #99FF99\n**${currentTimestamp()}**\n${formatPayload(
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
    const note = `note left #99FF99\n**${currentTimestamp()}**\n${formatPayload(
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
    const enquotedSource = quote(source);
    appendFileSync(
        getInputFile(scenarioId),
        `${enquotedSource} -[#FF6600]->o ALT : ${exchange}/${routingKey}\n`,
    );
    const note = `note left #FF6600\n**${currentTimestamp()}**\n${formatPayload(
        payload,
        diagramConfiguration,
    )}\nend note\n`;
    appendFileSync(getInputFile(scenarioId), note);
};

export const addMissingAMQPMessage = (
    scenarioId: string,
    exchange: string,
    routingKey: string,
    expectedMessages: number,
    receivedMessages: number,
    errorMsg: string,
): void => {
    addMissingAsyncMessage(
        scenarioId,
        `${exchange}/${routingKey}`,
        'AMQP',
        expectedMessages,
        receivedMessages,
        errorMsg,
    );
};

export const addMissingMQTTMessage = (
    scenarioId: string,
    topic: string,
    expectedMessages: number,
    receivedMessages: number,
    errorMsg: string,
): void => {
    addMissingAsyncMessage(
        scenarioId,
        topic,
        'MQTT',
        expectedMessages,
        receivedMessages,
        errorMsg,
    );
};

export const addMissingAsyncMessage = (
    scenarioId: string,
    asyncInfo: string,
    source: string,
    expectedMessages: number,
    receivedMessages: number,
    errorMsg: string,
): void => {
    const quotedSource = quote(source);
    appendFileSync(
        getInputFile(scenarioId),
        `${quotedSource} -[#red]->x ALT : ${asyncInfo}\n
        `,
    );

    const note = `note right #FF0000\n**${currentTimestamp()}**\n\n
${errorMsg}\n\n
Expected Messages:${expectedMessages}\nReceived Messages: ${receivedMessages}\nend note\n`;
    appendFileSync(getInputFile(scenarioId), note);
};

export const generateSequenceDiagram = (scenarioId: string): Promise<void> =>
    new Promise<void>(resolve => {
        appendFileSync(getInputFile(scenarioId), '\n@enduml');
        const gen = generate(getInputFile(scenarioId));
        gen.out.pipe(createWriteStream(getOutputFile(scenarioId)));
        gen.out.on('end', () => resolve());
    });
