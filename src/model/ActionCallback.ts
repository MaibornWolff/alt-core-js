interface ActionCallback {
    // actual promise as wrapper for the work that has been done
    promise: Promise<any>;
    // method callback for cancelling the asynchronous actions
    cancel(): void;
}

export { ActionCallback };
