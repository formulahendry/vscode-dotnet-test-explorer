export interface ITestResults {
    clearPreviousTestResults: boolean;
    testResults: TestResult[];
}

export class TestResult {
    public constructor(
        public readonly fullName: string,
        public readonly outcome: string,
        public readonly message: string,
        public readonly stackTrace: string) {
    }
}
