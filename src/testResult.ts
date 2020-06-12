export type Outcome =
    "None"
    | "Passed"
    | "Failed"
    | "Skipped"
    | "NotFound";

export interface ITestResult {
    readonly fullName: string;
    readonly outcome: Outcome;
    readonly message: string;
    readonly stackTrace: string;
}
