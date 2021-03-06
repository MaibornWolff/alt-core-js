import { appendFileSync } from 'fs';
import {
    addMissingAsyncMessage,
    currentTimestamp,
    DiagramConfiguration,
    formatPayload,
    getInputFile,
} from './diagramDrawing';

export const addAMQPReceivedMessage = (
    scenarioId: string,
    exchange: string,
    routingKey: string,
    payload: unknown,
    diagramConfiguration: DiagramConfiguration,
): void => {
    appendFileSync(
        getInputFile(scenarioId),
        `AMQP -->o ALT : ${exchange}/${routingKey}\n`,
    );
    const note = `note left #99FF99\n**${currentTimestamp()}**\n${formatPayload(
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
