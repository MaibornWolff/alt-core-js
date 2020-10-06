import { appendFileSync } from 'fs';
import {
    currentTimestamp,
    DiagramConfiguration,
    formatPayload,
    getInputFile,
    quote,
} from './diagramDrawing';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const wrap = require('word-wrap');

export const addRequest = (
    scenarioId: string,
    target: string,
    url: string,
    data: unknown,
    diagramConfiguration: DiagramConfiguration,
): void => {
    const quotedTarget = quote(target);
    const request = `ALT -> ${quotedTarget}: ${url}\nactivate ${quotedTarget}\n${
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
    addSuccessfulResponseArrow(scenarioId, source, status);
    if (body) {
        addSuccessfulResponseBody(scenarioId, body, diagramConfiguration);
    }
};

export const addSuccessfulResponseBody = (
    scenarioId: string,
    body: unknown,
    diagramConfiguration: DiagramConfiguration,
): void => {
    const note = `note left\n**${currentTimestamp()}**\n${formatPayload(
        body,
        diagramConfiguration,
    )}\nend note\n`;
    appendFileSync(getInputFile(scenarioId), note);
};

export const addFailedResponse = (
    scenarioId: string,
    source: string,
    status: string,
    body: string,
    diagramConfiguration: DiagramConfiguration,
): void => {
    addFailedResponseArrow(scenarioId, source, status);
    appendFileSync(
        getInputFile(scenarioId),
        `note right:  <color red>${formatPayload(
            body,
            diagramConfiguration,
        )}</color>\n||20||\n`,
    );
};

const addResponseArrow = (
    scenarioId: string,
    source: string,
    status: string,
    color: string,
): void => {
    const quotedSource = quote(source);
    appendFileSync(
        getInputFile(scenarioId),
        `${quotedSource} --> ALT: <color ${color}>${status}</color>\ndeactivate ${quotedSource}\n`,
    );
};

export const addSuccessfulResponseArrow = (
    scenarioId: string,
    source: string,
    status: string,
): void => addResponseArrow(scenarioId, source, status, 'green');

const addFailedResponseArrow = (
    scenarioId: string,
    source: string,
    status: string,
): void => addResponseArrow(scenarioId, source, status, 'red');

export const addValidationFailureResponseBody = (
    scenarioId: string,
    validationError: { errorMsg: string; responseBody: unknown },
    diagramConfiguration: DiagramConfiguration,
): void => {
    const formattedErrorMsg = `<size:16><color red>${wrap(
        validationError.errorMsg,
        { newline: '</color></size>\n<size:16><color red>', indent: '' },
    )}</color></size>`;

    const note = `note left\n**${currentTimestamp()}**\n${formattedErrorMsg}\n\nIncoming Response was:\n\n
${formatPayload(
    validationError.responseBody,
    diagramConfiguration,
)}\nend note\n`;
    appendFileSync(getInputFile(scenarioId), note);
};
