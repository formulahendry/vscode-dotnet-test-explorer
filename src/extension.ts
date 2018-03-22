"use strict";

import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { DotnetTestExplorer } from "./dotnetTestExplorer";
import { Executor } from "./executor";
import { TestCommands } from "./testCommands";
import { TestNode } from "./testNode";
import { TestResultsFile } from "./testResultsFile";
import { TestStatusCodeLensProvider } from "./testStatusCodeLensProvider";
import { Utility } from "./utility";
import { GotoTest } from "./gotoTest";

export function activate(context: vscode.ExtensionContext) {
    const testResults = new TestResultsFile();
    const discoverTests = new TestCommands(testResults);
    const gotoTest = new GotoTest();
    context.subscriptions.push(testResults);

    Utility.updateCache();
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(() => {
        Utility.updateCache();
    }));

    const dotnetTestExplorer = new DotnetTestExplorer(context, discoverTests, testResults);
    vscode.window.registerTreeDataProvider("dotnetTestExplorer", dotnetTestExplorer);
    AppInsightsClient.sendEvent("loadExtension");

    discoverTests.discoverTests();

    const codeLensProvider = new TestStatusCodeLensProvider(testResults);
    context.subscriptions.push(codeLensProvider);
    context.subscriptions.push(vscode.languages.registerCodeLensProvider(
        { language: "csharp", scheme: "file" },
        codeLensProvider));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.refreshTestExplorer", () => {
        dotnetTestExplorer.refreshTestExplorer();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.runAllTests", () => {
        discoverTests.runAllTests();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.runTest", (test: TestNode) => {
        discoverTests.runTest(test);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.gotoTest", (test: TestNode) => {
        gotoTest.go(test);
    }));

    context.subscriptions.push(vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
        Executor.onDidCloseTerminal(closedTerminal);
    }));
}

export function deactivate() {
}
