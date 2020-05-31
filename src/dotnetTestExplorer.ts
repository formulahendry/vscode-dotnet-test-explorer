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
import { Utility } from "./utility";

interface ITestNamespace {
    fullName: string;
    name: string;
    subNamespaces: Map<string, ITestNamespace>;
    tests: string[];
}

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
            // Show the welcome message.
            return [];
        }

        const treeMode = Utility.getConfiguration().get<string>("treeMode");

        if (treeMode === "flat") {
            return this.discoveredTests.map((name) => {
                return new TestNode("", name, this.testResults);
            });
        }

        let rootNamespace: ITestNamespace = { fullName: "", name: "", subNamespaces: new Map(), tests: [] };

        this.testNodes = [];

        this.discoveredTests.forEach((name: string) => {
            try {
                let currentNamespace = rootNamespace;

                let lastSegmentStart = 0;
                function processNameSegment(i: number) {
                    const part = name.substr(lastSegmentStart, i - lastSegmentStart);
                    const fullName = name.substr(0, i);
                    if (!currentNamespace.subNamespaces.has(part)) {
                        const newNamespace: ITestNamespace = {
                            fullName,
                            name: part,
                            subNamespaces: new Map(),
                            tests: [],
                        };
                        currentNamespace.subNamespaces.set(part, newNamespace);
                        currentNamespace = newNamespace;
                    } else {
                        currentNamespace = currentNamespace.subNamespaces.get(part);
                    }
                    lastSegmentStart = i + 1;
                }
                for (let i = 0; i < name.length; i++) {
                    const c = name[i];
                    if (c === "." || c === "+") {
                        processNameSegment(i);
                    } else if (c === "(") {
                        // read until the corresponding closing bracket
                        let openBrackets = 1;
                        i++;
                        while (i < name.length) {
                            if (name[i] === "(") {
                                openBrackets++;
                            } else if (name[i] === ")") {
                                openBrackets--;
                                if (openBrackets === 0) { break; }
                            } else if (name[i] === '"') {
                                i++;
                                while (i < name.length) {
                                    if (name[i] === "\\") {
                                        i += 2;
                                        continue;
                                    } else if (name[i] === '"') {
                                        break;
                                    } else {
                                        i++;
                                    }
                                }
                            }
                            i++;
                        }
                    }
                }
                const testName = name.substr(lastSegmentStart);
                currentNamespace.tests.push(testName);
            } catch (err) {
                Logger.LogError(`Failed to add test with name ${name}`, err);
            }
        });

        function mergeSingleItemNamespaces(namespace: ITestNamespace): ITestNamespace {
            if (namespace.tests.length === 0
                && namespace.subNamespaces.size === 1) {
                let [[, childNamespace]] = namespace.subNamespaces;
                childNamespace = mergeSingleItemNamespaces(childNamespace);
                return {
                    ...childNamespace,
                    name: namespace.name === "" ? childNamespace.name : `${namespace.name}.${childNamespace.name}`,
                };
            } else {
                const subNamespaces = new Map<string, ITestNamespace>(Array.from(
                    namespace.subNamespaces.values(),
                    (childNamespace) => {
                        const merged = mergeSingleItemNamespaces(childNamespace);
                        return [merged.name, merged] as [string, ITestNamespace];
                    }));
                return { ...namespace, subNamespaces };
            }
        }

        if (treeMode === "merged") {
            rootNamespace = mergeSingleItemNamespaces(rootNamespace);
        }

        const root = this.createNamespaceNode("", rootNamespace);

        return root.children;
    }

    private createNamespaceNode(parentNamespace: string, namespace: ITestNamespace): TestNode {
        const children = [];
        for (const subNamespace of namespace.subNamespaces.values()) {
            children.push(this.createNamespaceNode(namespace.fullName, subNamespace));
        }
        for (const test of namespace.tests) {
            const testNode = new TestNode(namespace.fullName, test, this.testResults);
            this.testNodes.push(testNode);
            children.push(testNode);
        }
        return new TestNode(parentNamespace, namespace.name, this.testResults, children);
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

        const filter = testRunContext.isSingleTest ?
            ((testNode: TestNode) => testNode.fqn === testRunContext.testName)
            : ((testNode: TestNode) => testNode.fullName.startsWith(testRunContext.testName));

        const testRun = this.testNodes.filter((testNode: TestNode) => !testNode.isFolder && filter(testNode));

        this.statusBar.testRunning(testRun.length);

        testRun.forEach((testNode: TestNode) => {
            testNode.setAsLoading();
            this._onDidChangeTreeData.fire(testNode);
        });
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
