import { TestResult } from "./testResult";
import { Utility } from "./utility";

export enum TestNodeIcon {
    Namespace = "namespace.png",
    NamespaceFailed = "namespaceFailed.png",
    NamespaceNotExecuted = "namespaceNotExecuted.png",
    NamespacePassed = "namespacePassed.png",
    Run = "run.png",
    Running = "spinner.svg",
    TestNotRun = "testNotRun.png",
}

export class TestNode {
    private _isUnknown: boolean;
    private _isLoading: boolean;
    private _icon: string;
    private _fqn: string;

    constructor(private _parentNamespace: string, private _name: string, testResults: TestResult[], private _children?: TestNode[]) {
        this.setIconFromTestResult(testResults);

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

    public get icon(): string {
        return this._icon;
        // if(this._isUnknown) {
        //     return TestNodeIcon.TestNotRun;
        // } else if(this._isLoading) {
        //     return TestNodeIcon.Running;
        // } else {
        //     return this._icon;
        // }
    }

    // public setAsLoading() {
    //     this._isUnknown = false;
    //     this._isLoading = true;
    // }

    // public getIsLoading() {
    //     return this._isLoading;
    // }

    // public setAsUnknown() {
    //     this._isUnknown = true;
    // }

    public setIcon(icon: string) {
        this._icon = icon;
    }

    public setIconFromTestResult(testResults: TestResult[]) {
        this._isLoading = false;
        this._isUnknown = false;

        if (!testResults) {
            this._icon = this.isFolder ? TestNodeIcon.Namespace : TestNodeIcon.Run;
        } else {
            if (this.isFolder) {

                const testsForFolder = testResults.filter((tr) => tr.fullName.startsWith(this.fullName));

                if (testsForFolder.some((tr) => tr.outcome === "Failed")) {
                    this._icon = TestNodeIcon.NamespaceFailed;
                } else if (testsForFolder.some((tr) => tr.outcome === "NotExecuted")) {
                    this._icon = TestNodeIcon.NamespaceNotExecuted;
                } else if (testsForFolder.some((tr) => tr.outcome === "Passed")) {
                    this._icon = TestNodeIcon.NamespacePassed;
                } else {
                    this._icon = TestNodeIcon.Namespace;
                }
            } else {
                const resultForTest = testResults.find((tr) => tr.fullName === this.fullName);

                if (resultForTest) {
                    this._icon = "test".concat(resultForTest.outcome, ".png");
                } else {
                    this._icon = TestNodeIcon.TestNotRun;
                }
            }
        }
    }
}
