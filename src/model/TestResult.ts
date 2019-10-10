class TestResult {
    public action: string;

    public duration: string;

    public successful: boolean;

    public allowFailure: boolean;

    public constructor(
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

    public isConsideredFailure(): boolean {
        return this.successful === false && this.allowFailure !== true;
    }
}

export { TestResult };
