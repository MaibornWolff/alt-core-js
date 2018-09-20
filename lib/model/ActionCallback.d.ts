interface ActionCallback {
    promise: Promise<any>;
    cancel(): void;
}
export { ActionCallback };
