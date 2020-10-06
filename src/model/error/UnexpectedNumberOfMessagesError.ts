export class UnexpectedNumberOfMessagesError extends Error {
    constructor(
        numberOfReceivedMessages?: number,
        expectedNumberOfMessages?: number,
    ) {
        super(
            `Received an unexpected number of messages: ${numberOfReceivedMessages} (expected: ${expectedNumberOfMessages})`,
        );
        // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = UnexpectedNumberOfMessagesError.name;
    }
}
