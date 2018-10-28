"use strict";

import * as vscode from "vscode";
import { AppInsights } from "./appInsights";
import { AppInsightsClient } from "./appInsightsClient";
import { DotnetTestExplorer } from "./dotnetTestExplorer";
import { Executor } from "./executor";
import { FindTestInContext } from "./findTestInContext";
import { GotoTest } from "./gotoTest";
import { LeftClickTest } from "./leftClickTest";
import { Logger } from "./logger";
import { Problems } from "./problems";
import { StatusBar } from "./statusBar";
import { TestCommands } from "./testCommands";
import { TestDirectories } from "./testDirectories";
import { TestNode } from "./testNode";
import { TestResultsFile } from "./testResultsFile";
import { TestStatusCodeLensProvider } from "./testStatusCodeLensProvider";
import { Utility } from "./utility";
import { Watch } from "./watch";

export function activate(context: vscode.ExtensionContext) {
    const testResults = new TestResultsFile();
    const testDirectories = new TestDirectories();
    const testCommands = new TestCommands(testResults, testDirectories);
    const gotoTest = new GotoTest();
    const findTestInContext = new FindTestInContext();
    const problems = new Problems(testCommands);
    const statusBar = new StatusBar(testCommands);
    const watch = new Watch(testCommands, testDirectories, testResults);
    const leftClickTest = new LeftClickTest();
    const appInsights = new AppInsights(testCommands, testDirectories);

    Logger.Log("Starting extension");

    testDirectories.parseTestDirectories();

    context.subscriptions.push(watch);
    context.subscriptions.push(problems);
    context.subscriptions.push(statusBar);

    Utility.updateCache();
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {

        if (e.affectsConfiguration("dotnet-test-explorer.testProjectPath")) {
            testDirectories.parseTestDirectories();
            testCommands.discoverTests();
        }

        Utility.updateCache();
    }));

    const dotnetTestExplorer = new DotnetTestExplorer(context, testCommands, testResults, statusBar);
    vscode.window.registerTreeDataProvider("dotnetTestExplorer", dotnetTestExplorer);
    AppInsightsClient.sendEvent("loadExtension");

    testCommands.discoverTests();

    const codeLensProvider = new TestStatusCodeLensProvider(testCommands);
    context.subscriptions.push(codeLensProvider);
    context.subscriptions.push(vscode.languages.registerCodeLensProvider(
        { language: "csharp", scheme: "file" },
        codeLensProvider));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.showLog", () => {
        Logger.Show();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.stop", () => {
        Executor.stop();
    }));

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
        findTestInContext.find(editor.document, editor.selection.start).then( (testRunContext) => {
            testCommands.runTestByName(testRunContext.testName, testRunContext.isSingleTest);
        });
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.gotoTest", (test: TestNode) => {
        gotoTest.go(test);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.rerunLastCommand", (test: TestNode) => {
        testCommands.rerunLastCommand();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.leftClickTest", (test: TestNode) => {
        leftClickTest.handle(test);
    }));

    context.subscriptions.push(vscode.window.onDidCloseTerminal((closedTerminal: vscode.Terminal) => {
        Executor.onDidCloseTerminal(closedTerminal);
    }));
}

export function deactivate() {
}
