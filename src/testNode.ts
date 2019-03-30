import { TestResult } from "./testResult";

export class TestNode {
    private _isError: boolean;
    private _isLoading: boolean;
    private _icon: string;

    constructor(private _parentPath: string, private _name: string, testResults: TestResult[], private _children?: TestNode[]) {
        this.setIcon(testResults);
    }

    public get name(): string {
        return this._name;
    }

    public get fullName(): string {
        return (this._parentPath ? `${this._parentPath}.` : "") + this._name;
    }

    public get fqn(): string {
        // We need to translate from how the test is represented in the tree to what it's fully qualified name is
        return this
            .fullName.replace(/ *\([^)]*\) */g, "") // removes test cases which are contained inside parentheses
            .replace("+", "."); // nested classes are reported as ParentClass+ChildClass;
    }

    public get parentPath(): string {
        return this._parentPath;
    }

    public get isFolder(): boolean {
        return this._children && this._children.length > 0;
    }

    public get children(): TestNode[] {
        return this._children;
    }

    public get isError(): boolean {
        return !!this._isError;
    }

    public get icon(): string {
        return (this._isLoading) ? "spinner.svg" : this._icon;
    }

    public setAsError(error: string) {
        this._isError = true;
        this._name = error;
    }

    public setAsLoading() {
        this._isLoading = true;
    }

    public setIcon(testResults: TestResult[]) {
        this._isLoading = false;

        if (!testResults) {
            this._icon = this.isFolder ? "namespace.png" : "run.png";
        } else {
            if (this.isFolder) {

                const testsForFolder = testResults.filter((tr) => tr.fullName.startsWith(this.fullName));

                if (testsForFolder.some((tr) => tr.outcome === "Failed")) {
                    this._icon = "namespaceFailed.png";
                } else if (testsForFolder.some((tr) => tr.outcome === "NotExecuted")) {
                    this._icon = "namespaceNotExecuted.png";
                } else if (testsForFolder.some((tr) => tr.outcome === "Passed")) {
                    this._icon = "namespacePassed.png";
                } else {
                    this._icon = "namespace.png";
                }
            } else {
                const resultForTest = testResults.find((tr) => tr.fullName === this.fullName);

                if (resultForTest) {
                    this._icon = "test".concat(resultForTest.outcome, ".png");
                } else {
                    this._icon = "testNotRun.png";
                }
            }
        }
    }
}
