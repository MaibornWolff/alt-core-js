import { appendFileSync, createWriteStream, writeFileSync } from 'fs';
import { generate } from 'node-plantuml';
import { OUTPUT_DIR } from '../index';
import { isArrayOfStrings, objectFromEntries, trim } from '../util';

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
    let textResult = hidePlaintextIfNeeded(
        payload,
        diagramConfiguration.hidePlaintext,
    );

    if (payload.startsWith('<html>')) {
        textResult = removeLineBreaks(textResult);
    }
    return trim(textResult, 30);
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

export function currentTimestamp(): string {
    return new Date().toISOString();
}

export function getInputFile(scenario: string): string {
    return `${OUTPUT_DIR()}/_${scenario}.input`;
}

export function quote(str: string): string {
    return `"${str}"`;
}

export function removeLineBreaks(str: string): string {
    return str.replace(/(\r\n|\n|\r)/gm, '');
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

export const addDelay = (scenarioId: string, durationInSec: number): void => {
    appendFileSync(
        getInputFile(scenarioId),
        `\n...sleep ${durationInSec} s...\n`,
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

const generateFile = (inputFile: string, outputFile: string): Promise<void> =>
    new Promise<void>(resolve => {
        const gen = generate(inputFile);
        gen.out.pipe(createWriteStream(outputFile));
        gen.out.on('end', resolve);
    });

export const generateSequenceDiagram = (scenarioId: string): Promise<void> => {
    appendFileSync(getInputFile(scenarioId), '\n@enduml');
    return generateFile(getInputFile(scenarioId), getOutputFile(scenarioId));
};
