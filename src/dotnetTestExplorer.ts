import * as path from "path";
import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { Executor } from "./executor";
import { Utility } from "./utility";
import { TreeDataProvider, TreeItem, TreeItemCollapsibleState } from "vscode";

export class TestNode {
    private _isError: boolean;

    constructor(private _parentPath: string, private _name: string, private _children?: TestNode[]) {
    }

    public get name(): string {
        return this._name;
    }

    public get fullName(): String {
        return `${this._parentPath}.${this._name}`;
    };

    public get isFolder(): boolean {
        return this._children && this._children.length > 0;
    }

    public get children(): TestNode[] {
        return this._children;
    }

    public get isError(): boolean {
        return !!this._isError;
    }

    public setAsError(error: string) {
        this._isError = true;
        this._name = error;
    }
}

export class DotnetTestExplorer implements TreeDataProvider<TestNode> {
    public _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    public readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    private testDirectoryPath: string;

    constructor(private context: vscode.ExtensionContext) {
    }

    public getTreeItem(element: TestNode): TreeItem {
        if(element.isError) {
            return new TreeItem(element.name);
        }

        return {
            label: element.name,
            collapsibleState: element.isFolder ? TreeItemCollapsibleState.Collapsed : void 0,
            iconPath: {
                dark: this.context.asAbsolutePath(path.join("resources", "dark", "run.png")),
                light: this.context.asAbsolutePath(path.join("resources", "light", "run.png")),
            }
        };
    }

    private addToObject(container: Object, parts: string[]): void {
        const title = parts.splice(0, 1)[0];

        if(parts.length == 1) {
            if(!container[title]) container[title] = [];
            container[title].push(parts[0]);
            return;
        }

        if(!container[title]) container[title] = {};
        this.addToObject(container[title], parts);
    }

    private createTestNode(parentPath: string, test: Object | string): TestNode[] {
        if(Array.isArray(test)) {
            return test.map(t => {
                return new TestNode(parentPath, t);
            });
        }
        else if(typeof test === 'object') {
            return Object.keys(test).map(key => {
                return new TestNode(parentPath, key, this.createTestNode((parentPath ? `${parentPath}.` : '') + key, test[key]));
            });
        }
        else {
            return [new TestNode(parentPath, test)];
        }
    }

    public getChildren(element?: TestNode): TestNode[] | Thenable<TestNode[]> {
        if(element) return element.children;

        const useTreeView = Utility.getConfiguration().get<string>("useTreeView");

        return this.loadTestStrings().then((fullNames: string[]) => {
            if(!useTreeView) {
                return fullNames.map(name => {
                    return new TestNode('', name);
                });
            }

            let structuredTests = {};

            fullNames.forEach((name: string) => {
                let parts = name.trim().split(".");
                this.addToObject(structuredTests, parts);
            });

            let root = this.createTestNode('', structuredTests);
            return root;
        }, (reason: any) => {
            return reason.map(e => {
                let item = new TestNode("", null);
                item.setAsError(e);
                return item;
            });
        });
    }

    private loadTestStrings(): Thenable<string[]> {
        this.evaluateTestDirectory();

        let msBuildRootTestMsg = Utility.getConfiguration().get<string>("msbuildRootTestMsg");
        msBuildRootTestMsg = msBuildRootTestMsg ? msBuildRootTestMsg : "The following Tests are available:";

        return new Promise((c, e) => {
            try {
                const testStrings = Executor
                    .execSync("dotnet test -t", this.testDirectoryPath)
                    .split(/[\r\n]+/g)
                    .filter((item) => item && !item.startsWith("[xUnit.net"));

                const index = testStrings.indexOf(msBuildRootTestMsg);
                if (index > -1) {
                    const result = testStrings
                        .slice(index + 1)
                        .sort((a, b) => a > b ? 1 : b > a ? -1 : 0)

                    c(result);
                }
            }
            catch (error) {
                return e(["Please open or set the test project", "and ensure your project compiles."]);
            }

            return c([]);
        });
    }

    public refreshTestExplorer(): void {
        this._onDidChangeTreeData.fire();
        AppInsightsClient.sendEvent("refreshTestExplorer");
    }

    public runAllTests(): void {
        this.evaluateTestDirectory();
        Executor.runInTerminal("dotnet test", this.testDirectoryPath);
        AppInsightsClient.sendEvent("runAllTests");
    }

    public runTest(test: TestNode): void {
        Executor.runInTerminal(`dotnet test --filter FullyQualifiedName~${test.fullName}`, this.testDirectoryPath);
        AppInsightsClient.sendEvent("runTest");
    }

    private evaluateTestDirectory(): void {
        const testProjectPath = Utility.getConfiguration().get<string>("testProjectPath");
        let testProjectFullPath = testProjectPath ? testProjectPath : vscode.workspace.rootPath;
        if (!path.isAbsolute(testProjectFullPath)) {
            testProjectFullPath = path.resolve(vscode.workspace.rootPath, testProjectPath);
        }
        this.testDirectoryPath = testProjectFullPath;
    }
}
