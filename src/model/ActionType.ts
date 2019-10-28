export enum ActionType {
    REST,
    TIMER,
    WEBSOCKET,
    MQTT,
    MQTT_PUBLISH,
    AMQP_LISTEN,
    PROCESS,
}

export type ActionTypeType = keyof typeof ActionType;
