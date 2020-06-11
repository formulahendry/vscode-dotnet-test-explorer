import * as path from "path";
import * as vscode from "vscode";
import { TreeDataProvider, TreeItem } from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { buildTree, ITestTreeNode, mergeSingleItemTrees } from "./buildTree";
import { Logger } from "./logger";
import { parseTestName } from "./parseTestName";
import { StatusBar } from "./statusBar";
import { ITestRunContext, TestCommands } from "./testCommands";
import { LoadingNode as LoadingTreeNode } from "./treeNodes/loadingNode";
import { TestNode } from "./treeNodes/testNode";
import { FolderNode } from "./treeNodes/folderNode";
import { TreeNode } from "./treeNodes/treeNode";
import { ITestResult } from "./testResult";
import { Utility } from "./utility";

export class DotnetTestExplorer implements TreeDataProvider<TreeNode> {

    private _onDidChangeTreeData: vscode.EventEmitter<TreeNode | void> = new vscode.EventEmitter<TreeNode | void>();
    public readonly onDidChangeTreeData: vscode.Event<TreeNode | void> = this._onDidChangeTreeData.event;

    private discoveredTests = new Set<string>();
    private testResults = new Map<string, ITestResult>();
    private rootNodes: TreeNode[] = [];
    private testNodes = new Map<string, TestNode>();
    private isDiscovering = false;

    constructor(private context: vscode.ExtensionContext, private testCommands: TestCommands, private statusBar: StatusBar) {
        testCommands.onTestDiscoveryFinished(this.updateWithDiscoveredTests, this);
        testCommands.onTestDiscoveryStarted(this.updateWithDiscoveringTest, this);
        testCommands.onTestRun(this.updateTreeWithRunningTests, this);
        testCommands.onNewTestResults(this.addTestResults, this);
        testCommands.onTestRunFinished(this.removeRunningTests, this);
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

    private getIcon(iconPath: string) {
        return {
            dark: this.context.asAbsolutePath(path.join("resources", "dark", iconPath)),
            light: this.context.asAbsolutePath(path.join("resources", "light", iconPath)),
        }
    }

    public getTreeItem(element: TreeNode): TreeItem {
        if (element instanceof TestNode) {
            return {
                label: element.label,
                iconPath: this.getIcon(element.state === "Running" ? "spinner.svg" : `test${element.state}.png`),
                contextValue: "test",
                command: {
                    command: "dotnet-test-explorer.leftClickTest",
                    title: "",
                    arguments: [element],
                }
            }
        } else if (element instanceof FolderNode) {
            return {
                label: element.label,
                collapsibleState: Utility.defaultCollapsibleState,
                iconPath: this.getIcon(
                    element.state === "Running" ? "spinner.svg" :
                        element.state === "NotRun" ? "namespace.png" :
                            `namespace${element.state}.png`),
                contextValue: "folder"
            }
        } else if (element instanceof LoadingTreeNode) {
            return { label: element.label, iconPath: this.getIcon("spinner.svg") }
        } else {
            return { label: element.label + " (internal warning: unknown node)" }
        }
    }

    public getChildren(element?: TreeNode): TreeNode[] | Thenable<TreeNode[]> {
        if (element) {
            return [...element.children];
        }
        if (this.isDiscovering) {
            return [new LoadingTreeNode()];
        }
        return this.rootNodes;
    }

    public rebuildTree() {
        this.testNodes.clear();

        const treeMode = Utility.getConfiguration().get<string>("treeMode");

        const discoveredTests = [...this.discoveredTests].sort();
        let tree: ITestTreeNode;
        if (treeMode === "flat") {
            tree = { name: "", fullName: "", subTrees: new Map(), tests: discoveredTests };
        }
        else {
            const parsedTestNames = discoveredTests.map(parseTestName);
            tree = buildTree(parsedTestNames);

            if (treeMode === "merged") {
                tree = mergeSingleItemTrees(tree);
            }
        }

        const concreteRoot = this.createConcreteTree("", tree);

        this.rootNodes = [...concreteRoot.children];

        this.statusBar.discovered(this.discoveredTests.size);
        this._onDidChangeTreeData.fire(null);
    }

    private registerNode<T extends TreeNode>(testNode: T) {
        if (testNode instanceof TestNode) {
            this.testNodes.set(testNode.fullName, testNode);
        }
        testNode.nodeChanged(() => this._onDidChangeTreeData.fire(testNode));
        return testNode;
    }

    private createConcreteTree(parentNamespace: string, abstractTree: ITestTreeNode): FolderNode {
        const result = new FolderNode(abstractTree.fullName, abstractTree.name);
        for (const subNamespace of abstractTree.subTrees.values()) {
            result.addFolderNode(this.createConcreteTree(abstractTree.fullName, subNamespace));
        }
        for (const test of abstractTree.tests) {
            const fullName = `${abstractTree.fullName}.${test}`;
            const testNode = new TestNode(fullName, test);
            const outcome = this.testResults.get(fullName)?.outcome;
            if (outcome && outcome !== "None" && outcome !== "NotFound") {
                testNode.state = outcome;
            }
            this.registerNode(testNode);
            result.addTestNode(testNode);
        }
        this.registerNode(result);
        return result;
    }

    private updateWithDiscoveringTest() {
        this.isDiscovering = true;
        this._onDidChangeTreeData.fire();
    }

    private updateWithDiscoveredTests(discoveredTests: Iterable<string>) {
        this.discoveredTests = new Set(discoveredTests);
        this.isDiscovering = false;
        this.rebuildTree();
        this.addTestResults(this.testResults.values());
    }

    private updateTreeWithRunningTests(testRunContext: ITestRunContext) {
        let numRunning = 0;
        function setRunning(nodes: Iterable<TreeNode>, prefix: string) {
            for (const node of nodes) {
                if (node instanceof FolderNode
                    && node.fullName.startsWith(prefix)) {
                    setRunning(node.children, prefix);
                }
                else if (node instanceof TestNode) {
                    if (node.fullName.startsWith(prefix)) {
                        node.state = "Running";
                        numRunning++;
                    }
                }
            }
        }

        if (testRunContext.isSingleTest) {
            this.testNodes.get(testRunContext.testName).state = "Running";
            numRunning = 1;
        }
        else {
            setRunning(this.rootNodes, testRunContext.testName);
        }

        this.statusBar.testRunning(numRunning);
    }

    private addTestResults(results: Iterable<ITestResult>) {
        const fullNamesForTestResults = [...results].map((r) => r.fullName);

        const discoveredTests = new Set(this.discoveredTests);
        const newTests = fullNamesForTestResults.filter((r) => !discoveredTests.has(r));

        if (newTests.length > 0) {
            for (const newTest of newTests) {
                this.discoveredTests.add(newTest);
            }
            this.rebuildTree();
        }

        for (const result of results) {
            if (result.outcome === "NotFound" || result.outcome === "None")
                continue;

            this.testResults.set(result.fullName, result);
            this.testNodes.get(result.fullName).state = result.outcome;
        }

        this.statusBar.testRun([...results]);

        this._onDidChangeTreeData.fire(null);
    }

    /** When a test run finishes, no tests should be spinning any more.
     *  Any test that is still running was not found, and as such should be removed from the list.
     */
    public removeRunningTests() {
        for (const node of [...this.testNodes.values()]) {
            if (node.state === "Running") {
                this.discoveredTests.delete(node.fullName);
                Logger.Log(`Test ${node.fullName} was not found - removing...`)
            }
        }
    }
}
