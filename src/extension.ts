"use strict";

import { exec, execFile } from "child_process";
import { mkdtemp, rmdir, unlink } from "fs/promises";
import { tmpdir } from "os";
import path = require("path");
import * as vscode from "vscode";
import { AppInsights } from "./appInsights";
import { AppInsightsClient } from "./appInsightsClient";
import { buildTree, ITestTreeNode, mergeSingleItemTrees } from "./buildTree";
import { DotnetTestExplorer } from "./dotnetTestExplorer";
import { Executor } from "./executor";
import { FindTestInContext } from "./findTestInContext";
import { GotoTest } from "./gotoTest";
import { LeftClickTest } from "./leftClickTest";
import { Logger } from "./logger";
import { parseTestName } from "./parseTestName";
import { Problems } from "./problems";
import { StatusBar } from "./statusBar";
import { TestCommands } from "./testCommands";
import { TestDirectories } from "./testDirectories";
import { TestNode } from "./testNode";
import { parseResults } from "./testResultsFile";
import { TestStatusCodeLensProvider } from "./testStatusCodeLensProvider";
import { Utility } from "./utility";
import { Watch } from "./watch";

export function activate(context: vscode.ExtensionContext) {
    const testDirectories = new TestDirectories();
    const testCommands = new TestCommands(testDirectories);
    const gotoTest = new GotoTest();
    const findTestInContext = new FindTestInContext();
    const problems = new Problems(testCommands);
    const statusBar = new StatusBar(testCommands);
    const watch = new Watch(testCommands, testDirectories);
    const leftClickTest = new LeftClickTest();
    const appInsights = new AppInsights(testCommands, testDirectories);

    const controller = vscode.tests.createTestController("helloWorldTests", "Hello World Tests");

    const env = {
        ...process.env,
        DOTNET_CLI_UI_LANGUAGE: "en",
        VSTEST_HOST_DEBUG: "0",
    };

    for (const folder of vscode.workspace.workspaceFolders) {
        const options = {
            cwd: folder.uri.fsPath,
            env
        }
        execFile("dotnet", ["test", "--list-tests", "--verbosity=quiet"], options, (error, stdout, stderr) => {
            console.log(stdout);
            if (error) {
                console.error(error);
                // some error happened
                // TODO: log it (properly)
                return;
            }

            const lines = stdout.split(/\n\r?|\r/);
            const rawTests = lines.filter(line => /^    /.test(line));
            const parsedTestNames = rawTests.map(x => parseTestName(x.trim()));
            // const rootTree = mergeSingleItemTrees(buildTree(parsedTestNames));
            const rootTree = buildTree(parsedTestNames);

            // convert the tree into tests
            const generateNode = (tree: ITestTreeNode) => {
                const treeNode = controller.createTestItem(tree.fullName, tree.name);
                for (const subTree of tree.subTrees.values()) {
                    treeNode.children.add(generateNode(subTree));
                }
                for (const test of tree.tests) {
                    treeNode.children.add(controller.createTestItem(tree.fullName + "." + test, test));
                }

                return treeNode;
            }

            const rootNode = generateNode(rootTree);
            rootNode.label = folder.name;
            controller.items.add(rootNode);
        });
    }

    controller.createRunProfile("Run", vscode.TestRunProfileKind.Run, async (request, token) => {
        const run = controller.createTestRun(request, "My test run", true);
        const wait = () => new Promise(resolve => setTimeout(resolve, 1000));

        const createFilterArg = (item: vscode.TestItem, negate: boolean) => {
            const fullMatch = item.children.size === 0;
            const operator = (negate ? "!" : "") + (fullMatch ? "=" : "~");
            const fullyQualifiedName = item.id.replaceAll(/\(.*\)/g, "");
            return `FullyQualifiedName${operator}${fullyQualifiedName}`;
        }

        const includeFilters = request.include?.map(item => createFilterArg(item, false));
        const excludeFilters = request.exclude.map(item => createFilterArg(item, true));

        const toBeJoined = [...excludeFilters];
        if (includeFilters) {
            toBeJoined.push("(" + includeFilters.join("|") + ")")
        }
        const joinedFilters = toBeJoined.join("&");

        const filterArgs = joinedFilters.length > 0 ? ["--filter", joinedFilters] : []
        const resultsFolder = path.join(tmpdir(), await mkdtemp("test-explorer"));
        const resultsFile = path.join(resultsFolder, "test-results.trx");
        const loggerArgs = ["--logger", "trx;LogFileName=" + resultsFile]

        try {
            const output = await new Promise((resolve, reject) => execFile(
                "dotnet", ["test", ...filterArgs, ...loggerArgs], {
                env,
                cwd: vscode.workspace.workspaceFolders[0].uri.fsPath
            }, (error, stdOut, stdErr) => {
                // if (error) reject(error);
                // else
                resolve(stdOut);
            }));

            const results = await parseResults(resultsFile);

            for (const result of results) {
                const parsedName = parseTestName(result.fullName);
                let item = controller.items.get("");
                for (const segment of parsedName.segments) {
                    const segmentString = parsedName.fullName.substring(0, segment.end);
                    item = item.children.get(segmentString);
                    if (item === undefined) {
                        // TODO: need to unfold folded items
                        console.error("no such test node:", result.fullName, result);
                        console.error("error at:", segmentString);
                    }
                }
                if (item === undefined) {
                    console.error("no such test:", result.fullName, result);
                }
                if (result.outcome === "Failed")
                    run.failed(item, { message: result.message });
                else if (result.outcome === "NotExecuted")
                    run.skipped(item);
                else if (result.outcome === "Passed")
                    run.passed(item);
                else
                    console.log("unexpected value for outcome: " + result.outcome);
            }
            run.end();
        }
        finally {
            // await unlink(resultsFile);
            await rmdir(resultsFolder);
        }
    });

    controller.createRunProfile("Debug", vscode.TestRunProfileKind.Debug, async (request, token) => {
        const run = controller.createTestRun(request, "My test run", true);
        const wait = () => new Promise(resolve => setTimeout(resolve, 1000));

        let tests = request.include ?? controller.items;
        tests.forEach(test => {
            run.enqueued(test);
        })
        await wait();
        tests.forEach(test => {
            run.started(test);
        })
        await wait();
        tests.forEach(test => {
            run.passed(test);
        });
        run.end();
    });

    controller.createRunProfile("Watch", vscode.TestRunProfileKind.Run, async (request, token) => {
        const run = controller.createTestRun(request, "My test run", true);
        const wait = () => new Promise(resolve => setTimeout(resolve, 100));

        let tests = request.include ?? controller.items;
        while (!token.isCancellationRequested) {
            tests.forEach(test => {
                run.enqueued(test);
            })
            await wait();
            tests.forEach(test => {
                run.started(test);
            })
            await wait();
            tests.forEach(test => {
                run.passed(test);
            });
            await wait();
        }
        run.end();
    });

    Logger.Log("Starting extension");

    testDirectories.parseTestDirectories();

    context.subscriptions.push(controller);
    context.subscriptions.push(problems);
    context.subscriptions.push(statusBar);
    context.subscriptions.push(testCommands);

    Utility.updateCache();

    const dotnetTestExplorer = new DotnetTestExplorer(context, testCommands, statusBar);
    vscode.window.registerTreeDataProvider("dotnetTestExplorer", dotnetTestExplorer);
    AppInsightsClient.sendEvent("loadExtension");

    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
        if (!e.affectsConfiguration("dotnet-test-explorer")) { return; }

        if (e.affectsConfiguration("dotnet-test-explorer.testProjectPath")) {
            testDirectories.parseTestDirectories();
            testCommands.discoverTests();
        }

        dotnetTestExplorer._onDidChangeTreeData.fire(null);

        Utility.updateCache();
    }));

    testCommands.discoverTests();

    const codeLensProvider = new TestStatusCodeLensProvider(testCommands);
    context.subscriptions.push(codeLensProvider);
    context.subscriptions.push(vscode.languages.registerCodeLensProvider(
        { language: "csharp", scheme: "file" },
        codeLensProvider));
    context.subscriptions.push(vscode.languages.registerCodeLensProvider(
        { language: "fsharp", scheme: "file" },
        codeLensProvider
    ));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.showLog", () => {
        Logger.Show();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.openPanel", () => {
        vscode.commands.executeCommand("workbench.view.extension.test");
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.stop", () => {
        Executor.stop();
        dotnetTestExplorer._onDidChangeTreeData.fire(null);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.refreshTestExplorer", () => {
        testDirectories.parseTestDirectories();
        dotnetTestExplorer.refreshTestExplorer();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.runAllTests", () => {
        testCommands.runAllTests();
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.runTest", (test: TestNode) => {
        testCommands.runTest(test);
    }));

    context.subscriptions.push(vscode.commands.registerTextEditorCommand("dotnet-test-explorer.runTestInContext", (editor: vscode.TextEditor) => {
        findTestInContext.find(editor.document, editor.selection.start).then((testRunContext) => {
            testCommands.runTestByName(testRunContext.testName, testRunContext.isSingleTest);
        });
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.gotoTest", (test: TestNode) => {
        gotoTest.go(test);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("dotnet-test-explorer.debugTest", (test: TestNode) => {
        testCommands.debugTestByName(test.fqn, true);
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
