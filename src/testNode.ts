import { TestResult } from "./testResult";
import { Utility } from "./utility";

export class TestNode {
    private _isUnknown: boolean;
    private _isLoading: boolean;
    private _icon: string;
    private _fqn: string;

    constructor(private _parentNamespace: string, private _name: string, testResults: TestResult[], private _children?: TestNode[]) {
        this.setIcon(testResults);

        this._fqn = Utility
            .getFqnTestName(this.fullName)
            .replace("+", "."); // nested classes are reported as ParentClass+ChildClass;
    }

    public get name(): string {
        return this._name;
    }

    public get fullName(): string {
        return (this._parentNamespace ? `${this._parentNamespace}.` : "") + this._name;
    }

    public get fqn(): string {
        // We need to translate from how the test is represented in the tree to what it's fully qualified name is
        return this._fqn;
    }

    public get parentNamespace(): string {
        return this._parentNamespace;
    }

    public get isFolder(): boolean {
        return this._children && this._children.length > 0;
    }

    public get children(): TestNode[] {
        return this._children;
    }

    // public get isError(): boolean {
    //     return !!this._isError;
    // }

    public get icon(): string {
        if(this._isUnknown) {
            return "testNotRun.png";
        } else if(this._isLoading) {
            return "spinner.svg";
        } else {
            return this._icon;
        }
    }

    public setAsLoading() {
        this._isUnknown = false;
        this._isLoading = true;
    }

    public getIsLoading() {
        return this._isLoading;
    }

    public setAsUnknown() {
        this._isUnknown = true;
    }

    public setIcon(testResults: TestResult[]) {
        this._isLoading = false;
        this._isUnknown = false;

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
