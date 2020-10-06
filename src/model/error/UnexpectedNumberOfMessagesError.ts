export class UnexpectedNumberOfMessagesError extends Error {
    constructor(
        numberOfReceivedMessages?: number,
        expectedNumberOfMessages?: number,
    ) {
        super(
            `Received an unexpected number of messages: ${numberOfReceivedMessages} (expected: ${expectedNumberOfMessages})`,
        );
        Object.setPrototypeOf(this, new.target.prototype);
        this.name = UnexpectedNumberOfMessagesError.name;
    }
}
