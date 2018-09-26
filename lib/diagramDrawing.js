"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var PLANTUML = require("node-plantuml");
var FS = require("fs");
var _1 = require(".");
function getInputFile(scenario) {
    return _1.OUTPUT_DIR() + "/_" + scenario + ".input";
}
function getOutputFile(scenario) {
    return _1.OUTPUT_DIR() + "/_" + scenario + ".png";
}
function extractPayload(dict) {
    return JSON.stringify(dict, null, 1);
}
function currentTimestamp() {
    return new Date().toISOString();
}
exports.initDiagramCreation = function (scenarioId) {
    FS.writeFileSync(getInputFile(scenarioId), "");
    var initValues = [
        '@startuml',
        'autonumber',
        'skinparam handwritten false',
        'control MQTT',
        'actor YATF #red\n'
    ];
    FS.appendFileSync(getInputFile(scenarioId), initValues.join('\n'));
};
exports.addRequest = function (scenarioId, target, url, data) {
    var _target = target.replace("-", "_");
    var _request = "YATF -> " + _target + ": " + url + "\nactivate " + _target + "\n";
    if (data) {
        _request += "note right\n**" + currentTimestamp() + "**\n" + extractPayload(data) + "\nend note\n";
    }
    FS.appendFileSync(getInputFile(scenarioId), _request);
};
exports.addSuccessfulResponse = function (scenarioId, source, status, body) {
    doAddResponse(scenarioId, source, status, 'green');
    if (body) {
        var note = "note left\n**" + currentTimestamp() + "**\n" + (typeof body == 'object' ? extractPayload(body) : body.substr(0, 30)) + "\nend note\n";
        FS.appendFileSync(getInputFile(scenarioId), note);
    }
};
exports.addFailedResponse = function (scenarioId, source, status, body) {
    doAddResponse(scenarioId, source, status, 'red');
    FS.appendFileSync(getInputFile(scenarioId), "note right:  <color red>" + body + "</color>\n||20||\n");
};
var doAddResponse = function (scenarioId, source, status, color) {
    var _source = source.replace("-", "_");
    FS.appendFileSync(getInputFile(scenarioId), _source + " --> YATF: <color " + color + ">" + status + "</color>\ndeactivate " + _source + "\n");
};
exports.addDelay = function (scenarioId, durationInSec) {
    FS.appendFileSync(getInputFile(scenarioId), "\n...sleep " + durationInSec + " s...\n");
};
exports.addWsMessage = function (scenarioId, source, payload) {
    var _source = source.replace("-", "_");
    FS.appendFileSync(getInputFile(scenarioId), _source + " -[#0000FF]->o YATF : [WS]\n");
    var note = "note left #aqua\n**" + currentTimestamp() + "**\n" + extractPayload(payload) + "\nend note\n";
    FS.appendFileSync(getInputFile(scenarioId), note);
};
exports.addMqttMessage = function (scenarioId, topic, payload) {
    FS.appendFileSync(getInputFile(scenarioId), "MQTT -[#green]->o YATF : " + topic + "\n");
    var note = "note right #99FF99\n**" + currentTimestamp() + "**\n" + extractPayload(payload) + "\nend note\n";
    FS.appendFileSync(getInputFile(scenarioId), note);
};
exports.addMqttPublishMessage = function (scenarioId, topic, payload) {
    FS.appendFileSync(getInputFile(scenarioId), "YATF -[#green]->o MQTT : " + topic + "\n");
    var note = "note left #99FF99\n**" + currentTimestamp() + "**\n" + extractPayload(JSON.parse(payload)) + "\nend note\n";
    FS.appendFileSync(getInputFile(scenarioId), note);
};
exports.generateSequenceDiagram = function (scenarioId) {
    return new Promise((function (resolve) {
        FS.appendFileSync(getInputFile(scenarioId), '\n@enduml');
        var gen = PLANTUML.generate(getInputFile(scenarioId));
        gen.out.pipe(FS.createWriteStream(getOutputFile(scenarioId)));
        gen.out.on('end', function () { return resolve(); });
    }));
};
