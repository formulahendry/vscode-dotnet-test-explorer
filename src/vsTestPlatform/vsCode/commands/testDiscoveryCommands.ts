import * as vscode from "vscode";
import { VSTestServiceIDE } from "../vsTest/vsTestServiceIDE"
import { TestManager } from "../vsTest/vsTestManager";
import { TestModel, Test, TestResult, TestOutcome } from "../../vsTest/vsTestModel"

export function RegisterTestDiscoveryCommands(context: vscode.ExtensionContext) {
    new TestDiscoveryCommands(context);
}

export class TestDiscoveryCommands {
    private testService: VSTestServiceIDE;
    constructor(private context: vscode.ExtensionContext) {
        //this.testService = TestManager.getInstance().getTestService();

        //const runCommand = vscode.commands.registerCommand("vstest.execution.run",
        //    test => this.runTests([test]));
        //context.subscriptions.push(runCommand);
    }
}