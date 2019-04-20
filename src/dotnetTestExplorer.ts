import * as path from "path";
import * as vscode from "vscode";
import { TreeDataProvider, TreeItem } from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { Logger } from "./logger";
import { StatusBar } from "./statusBar";
import { ITestRunContext, TestCommands } from "./testCommands";
import { IDiscoverTestsResult } from "./testDiscovery";
import { TestNode } from "./testNode";
import { ITestResult, TestResult } from "./testResult";
import { TestResultsFile } from "./testResultsFile";
import { Utility } from "./utility";

export class DotnetTestExplorer implements TreeDataProvider<TestNode> {

    public _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    public readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    private discoveredTests: string[];
    private testResults: TestResult[];
    private allNodes: TestNode[] = [];

    constructor(private context: vscode.ExtensionContext, private testCommands: TestCommands, private resultsFile: TestResultsFile, private statusBar: StatusBar) {
        testCommands.onTestDiscoveryFinished(this.updateWithDiscoveredTests, this);
        testCommands.onTestDiscoveryStarted(this.updateWithDiscoveringTest, this);
        testCommands.onTestRun(this.updateTreeWithRunningTests, this);
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
        if (element.isError) {
            return new TreeItem(element.name);
        }

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
            loadingNode.setAsLoading();
            return [loadingNode];
        }

        if (this.discoveredTests.length === 0) {
            return ["Please open or set the test project", "and ensure your project compiles."].map((e) => {
                const node = new TestNode("", e, this.testResults);
                node.setAsError(e);
                return node;
            });
        }

        const useTreeView = Utility.getConfiguration().get<string>("useTreeView");

        if (!useTreeView) {
            return this.discoveredTests.map((name) => {
                return new TestNode("", name, this.testResults);
            });
        }

        const structuredTests = {};

        this.allNodes = [];

        this.discoveredTests.forEach((name: string) => {
            try {
                // Split name on all dots that are not inside parenthesis MyNamespace.MyClass.MyMethod(value: "My.Dot") -> MyNamespace, MyClass, MyMethod(value: "My.Dot")
                this.addToObject(structuredTests, name.split(/\.(?![^\(]*\))/g));
            } catch (err) {
                Logger.LogError(`Failed to add test with name ${name}`, err);
            }
        });

        const root = this.createTestNode("", structuredTests);

        return root;
    }

    private addToObject(container: object, parts: string[]): void {
        const title = parts.splice(0, 1)[0];

        if (parts.length > 1) {
            if (!container[title]) {
                container[title] = {};
            }
            this.addToObject(container[title], parts);
        } else {
            if (!container[title]) {
                container[title] = [];
            }

            if (parts.length === 1) {
                container[title].push(parts[0]);
            }
        }
    }

    private createTestNode(parentPath: string, test: object | string): TestNode[] {
        let testNodes: TestNode[];

        if (Array.isArray(test)) {
            testNodes = test.map((t) => {
                return new TestNode(parentPath, t, this.testResults);
            });
        } else if (typeof test === "object") {
            testNodes = Object.keys(test).map((key) => {
                return new TestNode(parentPath, key, this.testResults, this.createTestNode((parentPath ? `${parentPath}.` : "") + key, test[key]));
            });
        } else {
            testNodes = [new TestNode(parentPath, test, this.testResults)];
        }

        this.allNodes = this.allNodes.concat(testNodes);

        return testNodes;
    }

    private updateWithDiscoveringTest() {
        this.discoveredTests = null;
        this._onDidChangeTreeData.fire();
    }

    private updateWithDiscoveredTests(results: IDiscoverTestsResult[]) {
        this.allNodes = [];
        this.discoveredTests = [].concat(...results.map( (r) => r.testNames));
        this.statusBar.discovered(this.discoveredTests.length);
        this._onDidChangeTreeData.fire();
    }

    private updateTreeWithRunningTests(testRunContext: ITestRunContext) {

        const filter = testRunContext.isSingleTest ?
            ((testNode: TestNode) => testNode.fqn === testRunContext.testName)
            : ((testNode: TestNode) => testNode.fullName.startsWith(testRunContext.testName));

        const testRun = this.allNodes.filter( (testNode: TestNode) => !testNode.isFolder && filter(testNode));

        this.statusBar.testRunning(testRun.length);

        testRun.forEach( (testNode: TestNode) => {
            testNode.setAsLoading();
            this._onDidChangeTreeData.fire(testNode);
        });
    }

    private addTestResults(results: ITestResult) {

        const fullNamesForTestResults = results.testResults.map( (r) => r.fullName);

        if (results.clearPreviousTestResults) {
            this.discoveredTests = [...fullNamesForTestResults];
            this.testResults = null;
        } else {
            const newTests = fullNamesForTestResults.filter( (r) => this.discoveredTests.indexOf(r) === -1);

            if (newTests.length > 0) {
                this.discoveredTests.push(...newTests);
            }
        }

        this.discoveredTests = this.discoveredTests.sort();

        this.statusBar.discovered(this.discoveredTests.length);

        if (this.testResults) {
            results.testResults.forEach( (newTestResult: TestResult) => {
                const indexOldTestResult = this.testResults.findIndex( (tr) => tr.fullName === newTestResult.fullName);

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

        this._onDidChangeTreeData.fire();
    }
}
