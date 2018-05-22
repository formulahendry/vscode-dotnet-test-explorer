"use strict";

import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { DotnetTestExplorer } from "./dotnetTestExplorer";
import { Executor } from "./executor";
import { FindTestInContext } from "./findTestInContext";
import { GotoTest } from "./gotoTest";
import { Logger } from "./logger";
import { MessagesController } from "./messages";
import { Problems } from "./problems";
import { TestCommands } from "./testCommands";
import { TestNode } from "./testNode";
import { TestResultsFile } from "./testResultsFile";
import { TestStatusCodeLensProvider } from "./testStatusCodeLensProvider";
import { Utility } from "./utility";
import { TestManager } from "./vsTestPlatform/vsCode/vsTest/vsTestManager";

export function activate(context: vscode.ExtensionContext) {
    const testResults = new TestResultsFile();
    const messagesController = new MessagesController(context.globalState);
    const testCommands = new TestCommands(testResults, messagesController);
    const gotoTest = new GotoTest();
    const findTestInContext = new FindTestInContext();
    const problems = new Problems(testResults);

    Logger.Log("Starting extension");

    context.subscriptions.push(testResults);
    context.subscriptions.push(problems);

    Utility.updateCache();
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {

        if (e.affectsConfiguration("dotnet-test-explorer.pathForResultFile") && testResults) {
            testResults.resetResultFilePath();
        }

        Utility.updateCache();
    }));

    const dotnetTestExplorer = new DotnetTestExplorer(context, testCommands, testResults);
    vscode.window.registerTreeDataProvider("dotnetTestExplorer", dotnetTestExplorer);
    AppInsightsClient.sendEvent("loadExtension");

    testCommands.discoverTests();

    TestManager.initialize(this.context, vscode.workspace.rootPath).then(() => {
        // this.isTestExplorerInitialized = true;
        // this._onDidChangeTreeData.fire();
        const testService = TestManager.getInstance().getTestService();
        testCommands.vsDiscoverTests(testService);
    });

    const codeLensProvider = new TestStatusCodeLensProvider(testResults);
    context.subscriptions.push(codeLensProvider);
    context.subscriptions.push(vscode.languages.registerCodeLensProvider(
        { language: "csharp", scheme: "file" },
        codeLensProvider));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.refreshTestExplorer", () => {
        dotnetTestExplorer.refreshTestExplorer();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.runAllTests", () => {
        testCommands.runAllTests();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.runTest", (test: TestNode) => {
        testCommands.runTest(test);
    }));

    context.subscriptions.push(vscode.commands.registerTextEditorCommand("dotnet-test-explorer.runTestInContext", (editor: vscode.TextEditor) => {
        findTestInContext.find(editor.document, editor.selection.start.line).then( (testName) => {
            testCommands.runTestByName(testName);
        });
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.gotoTest", (test: TestNode) => {
        gotoTest.go(test);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.rerunLastCommand", (test: TestNode) => {
        testCommands.rerunLastCommand();
    }));

    context.subscriptions.push(vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
        Executor.onDidCloseTerminal(closedTerminal);
    }));
}

export function deactivate() {
}
