import * as path from "path";
import * as vscode from "vscode";
import { TreeDataProvider, TreeItem, TreeItemCollapsibleState } from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { Executor } from "./executor";
import { TestCommands } from "./testCommands";
import { TestNode } from "./testNode";
import { Utility } from "./utility";

export class DotnetTestExplorer implements TreeDataProvider<TestNode> {
    public _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    public readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    /**
     * The directory where the dotnet-cli will
     * execute commands.
     */
    private testDirectoryPath: string;
    private discoveredTests: string[];

    constructor(private context: vscode.ExtensionContext, private testCommands: TestCommands) {
        testCommands.onNewTestDiscovery(this.updateWithDiscoveredTests, this);
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
        this.discoveredTests = null;
        this._onDidChangeTreeData.fire();

        this.testCommands.discoverTests();
        AppInsightsClient.sendEvent("refreshTestExplorer");
    }

    public getTreeItem(element: TestNode): TreeItem {
        if (element.isError) {
            return new TreeItem(element.name);
        }

        return {
            label: element.name,
            collapsibleState: element.isFolder ? TreeItemCollapsibleState.Collapsed : void 0,
            iconPath: {
                dark: this.context.asAbsolutePath(path.join("resources", "dark", element.icon)),
                light: this.context.asAbsolutePath(path.join("resources", "light", element.icon)),
            },
        };
    }

    public getChildren(element?: TestNode): TestNode[] | Thenable<TestNode[]> {

        if (element) {
            return element.children;
        }

        if (!this.discoveredTests) {
            const loadingNode = new TestNode("", "Loading...");
            loadingNode.setAsLoading();
            return [loadingNode];
        }

        if (this.discoveredTests.length === 0) {
            return ["Please open or set the test project", "and ensure your project compiles."].map((e) => {
                const node = new TestNode("", e);
                node.setAsError(e);
                return node;
            });
        }

        const useTreeView = Utility.getConfiguration().get<string>("useTreeView");

        if (!useTreeView) {
            return this.discoveredTests.map((name) => {
                return new TestNode("", name);
            });
        }

        const structuredTests = {};

        this.discoveredTests.forEach((name: string) => {
            // this regex matches test names that include data in them - for e.g.
            //  Foo.Bar.BazTest(p1=10, p2="blah.bleh")
            const match = /([^\(]+)(.*)/g.exec(name);
            if (match && match.length > 1) {
                const parts = match[1].split(".");
                if (match.length > 2 && match[2].trim().length > 0) {
                    // append the data bit of the test to the test method name
                    // so we can distinguish one test from another in the explorer
                    // pane
                    const testMethodName = parts[parts.length - 1];
                    parts[parts.length - 1] = testMethodName + match[2];
                }
                this.addToObject(structuredTests, parts);
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
        if (Array.isArray(test)) {
            return test.map((t) => {
                return new TestNode(parentPath, t);
            });
        } else if (typeof test === "object") {
            return Object.keys(test).map((key) => {
                return new TestNode(parentPath, key, this.createTestNode((parentPath ? `${parentPath}.` : "") + key, test[key]));
            });
        } else {
            return [new TestNode(parentPath, test)];
        }
    }

    private updateWithDiscoveredTests(results: string[]) {
        this.discoveredTests = results;
        this._onDidChangeTreeData.fire();
    }
}
