class TestResult {
    action: string;

    duration: string;

    successful: boolean;

    allowFailure: boolean;

    constructor(
        action: string,
        duration: string,
        successful: boolean,
        allowFailure: boolean,
    ) {
        this.action = action;
        this.duration = duration;
        this.successful = successful;
        this.allowFailure = allowFailure;
    }
}

export { TestResult };
