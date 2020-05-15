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

interface TestNamespace {
    name: string
    subNamespaces: Map<string, TestNamespace>
    tests: string[]
}

export class DotnetTestExplorer implements TreeDataProvider<TestNode> {

    public _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    public readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    private discoveredTests: string[];
    private testResults: TestResult[];
    private testNodes: TestNode[] = [];

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

        const treeMode = Utility.getConfiguration().get<string>("treeMode");

        if (treeMode === "flat") {
            return this.discoveredTests.map((name) => {
                return new TestNode("", name, this.testResults);
            });
        }

        let rootNamespace: TestNamespace = { name: "", subNamespaces: new Map(), tests: [] }

        this.testNodes = [];

        this.discoveredTests.forEach((name: string) => {
            try {
                // Split name on all dots that are not inside parenthesis MyNamespace.MyClass.MyMethod(value: "My.Dot") -> MyNamespace, MyClass, MyMethod(value: "My.Dot")
                const nameSplitted = name.split(/\.(?![^\(]*\))/g);
                let currentNamespace = rootNamespace;
                let namespaceParts = nameSplitted.slice(0, nameSplitted.length - 1);
                let testName = nameSplitted[nameSplitted.length - 1];
                for (const part of namespaceParts) {
                    if (!currentNamespace.subNamespaces.has(part)) {
                        const newNamespace = { name: part, subNamespaces: new Map(), tests: [] };
                        currentNamespace.subNamespaces.set(part, newNamespace);
                        currentNamespace = newNamespace;
                    }
                    else
                        currentNamespace = currentNamespace.subNamespaces.get(part);
                }
                currentNamespace.tests.push(testName)
            } catch (err) {
                Logger.LogError(`Failed to add test with name ${name}`, err);
            }
        });

        function mergeSingleItemNamespaces(namespace: TestNamespace): TestNamespace {
            if (namespace.tests.length === 0
                && namespace.subNamespaces.size === 1) {
                var [[_, childNamespace]] = namespace.subNamespaces;
                childNamespace = mergeSingleItemNamespaces(childNamespace);
                return {
                    name: namespace.name === "" ? childNamespace.name : `${namespace.name}.${childNamespace.name}`,
                    subNamespaces: childNamespace.subNamespaces,
                    tests: childNamespace.tests
                }
            }
            else {
                const subNamespaces = new Map<string, TestNamespace>(Array.from(
                    namespace.subNamespaces.values(),
                    childNamespace => {
                        const merged = mergeSingleItemNamespaces(childNamespace);
                        return <[string, TestNamespace]>[merged.name, merged];
                    }));
                return {
                    name: namespace.name,
                    subNamespaces,
                    tests: namespace.tests
                }
            }
        }

        if (treeMode === "merged")
            rootNamespace = mergeSingleItemNamespaces(rootNamespace)

        const root = this.createNamespaceNode("", rootNamespace);

        return root.children;
    }

    private createNamespaceNode(parentNamespace: string, namespace: TestNamespace): TestNode {
        const children = []
        const fullName = parentNamespace !== "" ? `${parentNamespace}.${namespace.name}` : namespace.name;
        for (const subNamespace of namespace.subNamespaces.values()) {
            children.push(this.createNamespaceNode(fullName, subNamespace))
        }
        for (const test of namespace.tests) {
            const testNode = new TestNode(fullName, test, this.testResults);
            this.testNodes.push(testNode)
            children.push(testNode)
        }
        return new TestNode(parentNamespace, namespace.name, this.testResults, children);
    }

    private updateWithDiscoveringTest() {
        this.discoveredTests = null;
        this._onDidChangeTreeData.fire({});
    }

    private updateWithDiscoveredTests(results: IDiscoverTestsResult[]) {
        this.testNodes = [];
        this.discoveredTests = [].concat(...results.map((r) => r.testNames));
        this.statusBar.discovered(this.discoveredTests.length);
        this._onDidChangeTreeData.fire({});
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

        this._onDidChangeTreeData.fire({});
    }
}
