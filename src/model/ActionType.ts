export enum ActionType {
    REST,
    TIMER,
    WEBSOCKET,
    MQTT,
    MQTT_PUBLISH,
    AMQP_LISTEN,
    NODE_JS,
}

export type ActionTypeType = keyof typeof ActionType;
