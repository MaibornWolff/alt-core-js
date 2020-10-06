import { appendFileSync } from 'fs';
import {
    currentTimestamp,
    DiagramConfiguration,
    formatPayload,
    getInputFile,
    quote,
} from './diagramDrawing';

export const addWsMessage = (
    scenarioId: string,
    source: string,
    payload: unknown,
    diagramConfiguration: DiagramConfiguration,
): void => {
    const quotedSource = quote(source);
    appendFileSync(
        getInputFile(scenarioId),
        `${quotedSource} -[#0000FF]->o ALT : [WS]\n`,
    );
    const note = `note left #aqua\n**${currentTimestamp()}**\n${formatPayload(
        payload,
        diagramConfiguration,
    )}\nend note\n`;
    appendFileSync(getInputFile(scenarioId), note);
};
