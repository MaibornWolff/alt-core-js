class TestResult {
    action: string;
    duration: string;
    successful: boolean;

    constructor(action: string, duration: string, successful: boolean) {
        this.action = action;
        this.duration = duration;
        this.successful = successful;
    }
}

export { TestResult }