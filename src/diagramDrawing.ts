import PLANTUML = require('node-plantuml');
import FS = require('fs');
import { OUTPUT_DIR } from '.';


function getInputFile(scenario: string) {
    return `${OUTPUT_DIR()}/_${scenario}.input`;
}

function getOutputFile(scenario: string) {
    return `${OUTPUT_DIR()}/_${scenario}.png`;
}

function extractPayload(dict: any) {
    return JSON.stringify(dict, null, 1);
}

function currentTimestamp() {
    return new Date().toISOString();
}

export const initDiagramCreation = (scenarioId: string) => {
    FS.writeFileSync(getInputFile(scenarioId), "");
    const initValues = [
        '@startuml',
        'autonumber',
        'skinparam handwritten false',
        'control MQTT',
        'actor YATF #red\n'
    ];
    FS.appendFileSync(getInputFile(scenarioId), initValues.join('\n'));
};

export const addRequest = (scenarioId: string, target: string, url: string, data: any) => {
    let _target = target.replace("-", "_");
    let _request = `YATF -> ${_target}: ${url}\nactivate ${_target}\n`;
    if (data) {
        _request += `note right\n**${currentTimestamp()}**\n${extractPayload(data)}\nend note\n`;
    }
    FS.appendFileSync(getInputFile(scenarioId), _request);
};

export const addSuccessfulResponse = (scenarioId: string, source: string, status: string, body: string) => {
    doAddResponse(scenarioId, source, status, 'green');
    if (body) {
        let note = `note left\n**${currentTimestamp()}**\n${typeof body == 'object' ? extractPayload(body) : body.substr(0, 30)}\nend note\n`;
        FS.appendFileSync(getInputFile(scenarioId), note)
    }
};

export const addFailedResponse = (scenarioId: string, source: string, status: string, body: string) => {
    doAddResponse(scenarioId, source, status, 'red');
    FS.appendFileSync(getInputFile(scenarioId), `note right:  <color red>${body}</color>\n||20||\n`);
};

const doAddResponse = (scenarioId: string, source: string, status: string, color: string) => {
    let _source = source.replace("-", "_");
    FS.appendFileSync(getInputFile(scenarioId), `${_source} --> YATF: <color ${color}>${status}</color>\ndeactivate ${_source}\n`);
};

export const addDelay = (scenarioId: string, durationInSec: number) => {
    FS.appendFileSync(getInputFile(scenarioId), `\n...sleep ${durationInSec} s...\n`);
};

export const addWsMessage = (scenarioId: string, source: string, payload: any) => {
    let _source = source.replace("-", "_");
    FS.appendFileSync(getInputFile(scenarioId), `${_source} -[#0000FF]->o YATF : [WS]\n`);
    let note = `note left #aqua\n**${currentTimestamp()}**\n${extractPayload(payload)}\nend note\n`;
    FS.appendFileSync(getInputFile(scenarioId), note)
};

export const addMqttMessage = (scenarioId: string, topic: string, payload: any) => {
    FS.appendFileSync(getInputFile(scenarioId), `MQTT -[#green]->o YATF : ${topic}\n`);
    let note = `note right #99FF99\n**${currentTimestamp()}**\n${extractPayload(payload)}\nend note\n`;
    FS.appendFileSync(getInputFile(scenarioId), note)
};

export const addMqttPublishMessage = (scenarioId: string, topic: string, payload: any) => {
    FS.appendFileSync(getInputFile(scenarioId), `YATF -[#green]->o MQTT : ${topic}\n`);
    let note = `note left #99FF99\n**${currentTimestamp()}**\n${extractPayload(JSON.parse(payload))}\nend note\n`;
    FS.appendFileSync(getInputFile(scenarioId), note)
};

export const generateSequenceDiagram = (scenarioId: string): Promise<any> => {

    return new Promise<any>((resolve => {
        FS.appendFileSync(getInputFile(scenarioId), '\n@enduml');
        const gen = PLANTUML.generate(getInputFile(scenarioId));
        gen.out.pipe(FS.createWriteStream(getOutputFile(scenarioId)));
        gen.out.on('end', () => resolve());
    }));
};
