import { Action } from "./Action";
import { ActionType } from "./ActionType";
import { Scenario } from "./Scenario";
import { ActionCallback } from "./ActionCallback";
declare class WebSocketAction implements Action {
    private wsInstance;
    private reconnected;
    serviceName: string;
    name: string;
    type: ActionType;
    url: string;
    headers: any;
    data: any;
    expectedNumberOfMessages: number;
    messageFilter: string[];
    private receivedMessages;
    constructor(name: string, wsDefinition: any, serviceName: string, url?: any, headers?: any, data?: any, expectedNumberOfMessages?: any, messageFilter?: any);
    static fromTemplate(wsDefinition: any, template: WebSocketAction): WebSocketAction;
    private static loadData;
    invoke(scenario: Scenario): ActionCallback;
    invokeAsync(scenario: Scenario): void;
}
export { WebSocketAction };
