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
import { TestStatusCodeLensProvider } from "./testStatusCodeLensProvider";
import { Utility } from "./utility";
import { Watch } from "./watch";
import { createLocalTcpServer, readAllFromSocket, ILocalServer, shutdown } from "./netUtil";
import { TestResultsListener } from "./testResultsListener";
import { TestNode } from "./treeNodes/testNode";
import { TreeNode } from "./treeNodes/treeNode";

export async function activate(context: vscode.ExtensionContext) {
    Utility.loggerPath = `${context.extensionPath}/out/logger/`;

    const testDirectories = new TestDirectories();
    const listener = await TestResultsListener.create();
    const testCommands = new TestCommands(testDirectories, listener);
    const gotoTest = new GotoTest();
    const findTestInContext = new FindTestInContext();
    const problems = new Problems(testCommands);
    const statusBar = new StatusBar(testCommands);
    const leftClickTest = new LeftClickTest();
    const appInsights = new AppInsights(testCommands, testDirectories);

    Logger.Log("Starting extension");

    testDirectories.parseTestDirectories();

    context.subscriptions.push(problems);
    context.subscriptions.push(statusBar);
    context.subscriptions.push(testCommands);
    context.subscriptions.push(listener);

    Utility.updateCache();

    const dotnetTestExplorer = new DotnetTestExplorer(context, testCommands, statusBar);
    vscode.window.registerTreeDataProvider("dotnetTestExplorer", dotnetTestExplorer);
    AppInsightsClient.sendEvent("loadExtension");

    listener.onMessage((parsed) => {
        if (parsed.type === "result") {
            testCommands.sendNewTestResults([parsed])
        }
    });

    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
        if (!e.affectsConfiguration("dotnet-test-explorer")) { return; }

        if (e.affectsConfiguration("dotnet-test-explorer.testProjectPath")) {
            testDirectories.parseTestDirectories();
            testCommands.discoverTests();
        }

        if (e.affectsConfiguration("dotnet-test-explorer.autoWatch")) {
            testCommands.updateWatch();
        }

        dotnetTestExplorer.rebuildTree();

        Utility.updateCache();
    }));

    testCommands.discoverTests();

    const codeLensProvider = new TestStatusCodeLensProvider(testCommands);
    context.subscriptions.push(codeLensProvider);
    context.subscriptions.push(vscode.languages.registerCodeLensProvider(
        { language: "csharp", scheme: "file" },
        codeLensProvider));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.showLog", () => {
        Logger.Show();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.openPanel", () => {
        vscode.commands.executeCommand("workbench.view.extension.test");
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.stop", () => {
        Executor.stop();
        dotnetTestExplorer.refreshTestExplorer();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.refreshTestExplorer", () => {
        testDirectories.parseTestDirectories();
        dotnetTestExplorer.refreshTestExplorer();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.runAllTests", () => {
        testCommands.runAllTests();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.runTest", (test: TreeNode) => {
        testCommands.runTest(test);
    }));

    context.subscriptions.push(vscode.commands.registerTextEditorCommand("dotnet-test-explorer.runTestInContext", async (editor: vscode.TextEditor) => {
        const testRunContext = await findTestInContext.find(editor.document, editor.selection.start);
        testCommands.runTestByName(testRunContext.testName, testRunContext.isSingleTest);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.gotoTest", (test: TestNode) => {
        gotoTest.go(test);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.debugTest", (test: TestNode) => {
        testCommands.debugTestByName(test.fullName, true);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.rerunLastCommand", () => {
        testCommands.rerunLastCommand();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.leftClickTest", (test: TreeNode) => {
        leftClickTest.handle(test);
    }));
}

export function deactivate() {
    Executor.stop();
}
