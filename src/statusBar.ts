import * as vscode from "vscode";
import { TestResult } from "./testResult";

export class StatusBar {
    private status: vscode.StatusBarItem;
    private baseStatusText: string;

    public constructor() {
        this.status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.discovering();
    }

    public discovering() {
        this.baseStatusText = "";
        this.status.text = `$(beaker) $(sync~spin) Discovering tests`;
        this.status.show();
    }

    public discovered(numberOfTests: number) {
        this.baseStatusText = `$(beaker) ${numberOfTests} tests`;
        this.status.text = this.baseStatusText;
    }

    public testRunning(numberOfTestRun: number) {
        this.status.text = `${this.baseStatusText} ($(sync~spin) Running ${numberOfTestRun} tests)`;
    }

    public testRun(results: TestResult[]) {
        const failed = results.filter( (r: TestResult) => r.outcome === "Failed").length;
        const notExecuted = results.filter( (r: TestResult) => r.outcome === "NotExecuted").length;
        const passed = results.filter( (r: TestResult) => r.outcome === "Passed").length;

        this.status.text = `${this.baseStatusText} ($(check) ${passed} | $(x) ${failed}) | $(question) ${notExecuted})`;
    }

    public dispose() {
        if (this.status) {
            this.status.dispose();
        }
    }
}
