import * as vscode from "vscode";
import { TestCommands } from "./testCommands";
import { ITestResult } from "./testResult";

export class StatusBar {
    private status: vscode.StatusBarItem;
    private baseStatusText: string;

    public constructor(testCommand: TestCommands) {
        this.status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        testCommand.onTestDiscoveryStarted(this.updateWithDiscoveringTest, this);
        this.status.command = "dotnet-test-explorer.openPanel";
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

    public testRun(results: ITestResult[]) {
        const failed = results.filter( (r: ITestResult) => r.outcome === "Failed").length;
        const skipped = results.filter( (r: ITestResult) => r.outcome === "Skipped").length;
        const passed = results.filter( (r: ITestResult) => r.outcome === "Passed").length;

        this.status.text = `${this.baseStatusText} ($(check) ${passed} | $(x) ${failed}) | $(question) ${skipped})`;
    }

    public dispose() {
        if (this.status) {
            this.status.dispose();
        }
    }

    private updateWithDiscoveringTest() {
        this.discovering();
    }
}
