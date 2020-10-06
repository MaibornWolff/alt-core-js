import { appendFileSync } from 'fs';
import {
    DiagramConfiguration,
    formatPayload,
    getInputFile,
    currentTimestamp,
    addMissingAsyncMessage,
} from './diagramDrawing';
import { OUTPUT_DIR } from '../index';

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
