import * as path from "path";
import * as vscode from "vscode";
import { TreeDataProvider, TreeItem } from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { buildTree, ITestTreeNode, mergeSingleItemTrees } from "./buildTree";
import { Logger } from "./logger";
import { parseTestName } from "./parseTestName";
import { StatusBar } from "./statusBar";
import { ITestRunContext, TestCommands } from "./testCommands";
import { IDiscoverTestsResult } from "./testDiscovery";
import { TestNode, TestNodeIcon } from "./testNode";
import { ITestResult, TestResult } from "./testResult";
import { Utility } from "./utility";

export class DotnetTestExplorer implements TreeDataProvider<TestNode> {

    public _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    public readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    private discoveredTests: string[];
    private testResults: TestResult[];
    private testNodes: TestNode[] = [];

    constructor(private context: vscode.ExtensionContext, private testCommands: TestCommands, private statusBar: StatusBar) {
        testCommands.onTestDiscoveryFinished(this.updateWithDiscoveredTests, this);
        testCommands.onTestDiscoveryStarted(this.updateWithDiscoveringTest, this);
        testCommands.onTestRun(this.updateTreeWithRunningTests, this);
        testCommands.onBuildFail(this.updateTreeWithNotRunTests, this);
        testCommands.onNewTestResults(this.addTestResults, this);
    }

    /**
     * @description
     * Refreshes the test explorer pane by running the
     * `dotnet test` command and requesting information about
     * discovered tests.
     * @summary
     * This method can cause the project to rebuild or try
     * to do a restore, so it can be very slow.
     */
    public refreshTestExplorer(): void {
        this.testCommands.discoverTests();

        AppInsightsClient.sendEvent("refreshTestExplorer");
    }

    public getTreeItem(element: TestNode): TreeItem {
        // if (element.isError) {
        //     return new TreeItem(element.name);
        // }

        return {
            label: element.name,
            collapsibleState: element.isFolder ? Utility.defaultCollapsibleState : void 0,
            iconPath: element.icon ? {
                dark: this.context.asAbsolutePath(path.join("resources", "dark", element.icon)),
                light: this.context.asAbsolutePath(path.join("resources", "light", element.icon)),
            } : void 0,
            contextValue: element.isFolder ? "folder" : "test",
            command: element.isFolder ? null : {
                command: "dotnet-test-explorer.leftClickTest",
                title: "",
                arguments: [element],
            },
        };
    }

    public getChildren(element?: TestNode): TestNode[] | Thenable<TestNode[]> {

        if (element) {
            return element.children;
        }

        if (!this.discoveredTests) {
            const loadingNode = new TestNode("", "Discovering tests", this.testResults);
            loadingNode.setIcon(TestNodeIcon.Running);
            return [loadingNode];
        }

        if (this.discoveredTests.length === 0) {
            // Show the welcome message.
            return [];
        }

        const treeMode = Utility.getConfiguration().get<string>("treeMode");

        if (treeMode === "flat") {
            return this.testNodes = this.discoveredTests.map((name) => {
                return new TestNode("", name, this.testResults);
            });
        }

        const parsedTestNames = this.discoveredTests.map(parseTestName);
        let tree = buildTree(parsedTestNames);

        if (treeMode === "merged") {
            tree = mergeSingleItemTrees(tree);
        }

        this.testNodes = [];
        const concreteRoot = this.createConcreteTree("", tree);

        return concreteRoot.children;
    }

    private createConcreteTree(parentNamespace: string, abstractTree: ITestTreeNode): TestNode {
        const children = [];
        for (const subNamespace of abstractTree.subTrees.values()) {
            children.push(this.createConcreteTree(abstractTree.fullName, subNamespace));
        }
        for (const test of abstractTree.tests) {
            const testNode = new TestNode(abstractTree.fullName, test, this.testResults);
            this.testNodes.push(testNode);
            children.push(testNode);
        }
        return new TestNode(parentNamespace, abstractTree.name, this.testResults, children);
    }

    private updateWithDiscoveringTest() {
        this.discoveredTests = null;
        this._onDidChangeTreeData.fire(null);
    }

    private updateWithDiscoveredTests(results: IDiscoverTestsResult[]) {
        this.testNodes = [];
        this.discoveredTests = [].concat(...results.map((r) => r.testNames));
        this.statusBar.discovered(this.discoveredTests.length);
        this._onDidChangeTreeData.fire(null);
    }

    private updateTreeWithRunningTests(testRunContext: ITestRunContext) {
        const runningTests = this.getNodesMatchingTestRun(testRunContext);

        this.statusBar.testRunning(runningTests.length);

        runningTests.forEach((testNode: TestNode) => {
            testNode.setIcon(TestNodeIcon.Running);
            this._onDidChangeTreeData.fire(testNode);
        });
    }

    private updateTreeWithNotRunTests(testRunContext: ITestRunContext) {

        const runningTests = this.getNodesMatchingTestRun(testRunContext);

        runningTests.forEach((testNode: TestNode) => {
            testNode.setIcon(TestNodeIcon.TestNotRun);
            this._onDidChangeTreeData.fire(testNode);
        });
    }

    private getNodesMatchingTestRun(testRunContext: ITestRunContext) {
        const filter = testRunContext.isSingleTest ?
            ((testNode: TestNode) => testNode.fqn === testRunContext.testName)
            : ((testNode: TestNode) => testNode.fullName.startsWith(testRunContext.testName));

        return this.testNodes.filter((testNode: TestNode) => !testNode.isFolder && filter(testNode));
    }

    private addTestResults(results: ITestResult) {

        const fullNamesForTestResults = results.testResults.map((r) => r.fullName);

        if (results.clearPreviousTestResults) {
            this.discoveredTests = [...fullNamesForTestResults];
            this.testResults = null;
        } else {
            const newTests = fullNamesForTestResults.filter((r) => this.discoveredTests.indexOf(r) === -1);

            if (newTests.length > 0) {
                this.discoveredTests.push(...newTests);
            }
        }

        this.discoveredTests = this.discoveredTests.sort();

        this.statusBar.discovered(this.discoveredTests.length);

        if (this.testResults) {
            results.testResults.forEach((newTestResult: TestResult) => {
                const indexOldTestResult = this.testResults.findIndex((tr) => tr.fullName === newTestResult.fullName);

                if (indexOldTestResult < 0) {
                    this.testResults.push(newTestResult);
                } else {
                    this.testResults[indexOldTestResult] = newTestResult;
                }
            });
        } else {
            this.testResults = results.testResults;
        }

        this.statusBar.testRun(results.testResults);

        this._onDidChangeTreeData.fire(null);
    }
}
