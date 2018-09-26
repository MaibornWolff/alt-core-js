/// <reference types="node" />
import { Action } from "./Action";
import { ActionType } from "./ActionType";
import { Scenario } from "./Scenario";
import { ActionCallback } from "./ActionCallback";
declare class MqttAction implements Action {
    name: string;
    type: ActionType;
    url: string;
    username: string;
    password: string;
    topic: string;
    durationInSec: number;
    expectedNumberOfMessages: number;
    messageType: string;
    messageFilter: string[];
    protoFile: string;
    protoClass: string;
    constructor(name: string, mqttDefinition: any, url?: any, username?: any, password?: any, topic?: any, durationInSec?: any, expectedNumberOfMessages?: any, messageType?: any, messageFilter?: any, protoFile?: any, protoClass?: any);
    static fromTemplate(mqttDefinition: any, template: MqttAction): MqttAction;
    invoke(scenario: Scenario): ActionCallback;
    decodeProtoPayload(buffer: Buffer): any;
    invokeAsync(scenario: Scenario): void;
}
export { MqttAction };
