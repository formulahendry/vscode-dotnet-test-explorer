import { TestResult } from "./testResult";

export class TestNode {
    private _isError: boolean;
    private _icon: string;

    constructor(private _parentPath: string, private _name: string, testResults: TestResult[], private _children?: TestNode[]) {
        this.setIconFromTestResult(testResults);
    }

    public get name(): string {
        return this._name;
    }

    public get parentPath(): string {
        return this._parentPath;
    }

    public get fullName(): string {
        return (this._parentPath ? `${this._parentPath}.` : "") + this._name;
    }

    public get isFolder(): boolean {
        return this._children && this._children.length > 0;
    }

    public get icon(): string {
        return this._icon;
    }

    public get children(): TestNode[] {
        return this._children;
    }

    public get isError(): boolean {
        return !!this._isError;
    }

    public setAsError(error: string) {
        this._isError = true;
        this._name = error;
    }

    private setIconFromTestResult(testResults: TestResult[]) {
        // If the test node does not contain a namespace (nunit, mstest?) we have no real way of matching a test result to a test node
        if (!testResults) {
            this._icon = "run.png";
        } else {
            if (this.isFolder) {

                const testsForFolder = testResults.filter((tr) => tr.fullName.startsWith(this.fullName));

                if (testsForFolder.some((tr) => tr.outcome === "Failed")) {
                    this._icon = "runFailed.png";
                } else if (testsForFolder.some((tr) => tr.outcome === "NotExecuted")) {
                    this._icon = "runNotExecuted.png";
                } else if (testsForFolder.some((tr) => tr.outcome === "Passed")) {
                    this._icon = "runPassed.png";
                } else {
                    this._icon = "run.png";
                }
            } else {
                const resultForTest = testResults.find((tr) => tr.fullName === this.fullName);

                if (resultForTest) {
                    this._icon = "run".concat(resultForTest.outcome, ".png");
                } else {
                    this._icon = "run.png";
                }
            }
        }
    }
}
