"use strict";

import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { DotnetTestExplorer } from "./dotnetTestExplorer";
import { Executor } from "./executor";
import { GoToTest } from "./goToTest";
import { TestNode } from "./testNode";
import { TestResultsFile } from "./testResultsFile";
import { TestStatusCodeLensProvider } from "./testStatusCodeLensProvider";
import { Utility } from "./utility";

export function activate(context: vscode.ExtensionContext) {
    const testResults = new TestResultsFile();
    context.subscriptions.push(testResults);

    Utility.updateCache();
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(() => {
        Utility.updateCache();
    }));
    const dotnetTestExplorer = new DotnetTestExplorer(context, testResults);
    vscode.window.registerTreeDataProvider("dotnetTestExplorer", dotnetTestExplorer);
    AppInsightsClient.sendEvent("loadExtension");

    const codeLensProvider = new TestStatusCodeLensProvider(testResults);
    context.subscriptions.push(codeLensProvider);
    context.subscriptions.push(vscode.languages.registerCodeLensProvider(
        { language: "csharp", scheme: "file" },
        codeLensProvider));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.refreshTestExplorer", () => {
        dotnetTestExplorer.refreshTestExplorer(true);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.runAllTests", () => {
        dotnetTestExplorer.runAllTests();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.runTest", (test: TestNode) => {
        dotnetTestExplorer.runTest(test);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.goToTest", (test: TestNode) => {
        GoToTest(test);
    }));

    context.subscriptions.push(vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
        Executor.onDidCloseTerminal(closedTerminal);
    }));
    vscode.commands.registerCommand("onSelectedUnitTest", (test: TestNode) => dotnetTestExplorer.onSelectedUnitTest(test));
}

export function deactivate() {
}
