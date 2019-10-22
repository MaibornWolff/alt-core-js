export enum ActionType {
    REST,
    TIMER,
    WEBSOCKET,
    MQTT,
    MQTT_PUBLISH,
    AMQP_LISTEN,
}

export type ActionTypeType = keyof typeof ActionType;
