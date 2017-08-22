import * as path from "path";
import * as vscode from "vscode";
import { TreeDataProvider, TreeItem, TreeItemCollapsibleState } from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { Executor } from "./executor";
import { TestNode } from "./testNode";
import { Utility } from "./utility";

export class DotnetTestExplorer implements TreeDataProvider<TestNode> {
    public _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    public readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    private testDirectoryPath: string;

    constructor(private context: vscode.ExtensionContext) {
    }

    public getTreeItem(element: TestNode): TreeItem {
        if (element.isError) {
            return new TreeItem(element.name);
        }

        return {
            label: element.name,
            collapsibleState: element.isFolder ? TreeItemCollapsibleState.Collapsed : void 0,
            iconPath: {
                dark: this.context.asAbsolutePath(path.join("resources", "dark", "run.png")),
                light: this.context.asAbsolutePath(path.join("resources", "light", "run.png")),
            },
        };
    }

    public getChildren(element?: TestNode): TestNode[] | Thenable<TestNode[]> {
        if (element) {
            return element.children;
        }

        const useTreeView = Utility.getConfiguration().get<string>("useTreeView");

        return this.loadTestStrings().then((fullNames: string[]) => {
            if (!useTreeView) {
                return fullNames.map((name) => {
                    return new TestNode("", name);
                });
            }

            const structuredTests = {};

            fullNames.forEach((name: string) => {
                const parts = name.split(".");
                this.addToObject(structuredTests, parts);
            });

            const root = this.createTestNode("", structuredTests);
            return root;
        }, (reason: any) => {
            return reason.map((e) => {
                const item = new TestNode("", null);
                item.setAsError(e);
                return item;
            });
        });
    }

    public refreshTestExplorer(): void {
        this._onDidChangeTreeData.fire();
        AppInsightsClient.sendEvent("refreshTestExplorer");
    }

    public runAllTests(): void {
        this.evaluateTestDirectory();
        Executor.runInTerminal(`dotnet test -v=q ${this.enableBuild()} ${this.enableRestore()}`, this.testDirectoryPath);
        AppInsightsClient.sendEvent("runAllTests");
    }

    public runTest(test: TestNode): void {
        Executor.runInTerminal(`dotnet test -v=q ${this.enableBuild()} ${this.enableRestore()} --filter FullyQualifiedName~${test.fullName}`, this.testDirectoryPath);
        AppInsightsClient.sendEvent("runTest");
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

    private enableBuild(): string {
        const dotnetBuildOption = Utility.getConfiguration().get<boolean>("build");
        return dotnetBuildOption ? "" : "--no-build";
    }

    private enableRestore(): string {
        const dotnetRestoreOption = Utility.getConfiguration().get<boolean>("restore");
        return dotnetRestoreOption ? "" : "--no-restore";
    }

    private loadExclusion(name: string, value: string): string {
        const exclusion = Utility.getConfiguration().get<string>(name);
        return exclusion ? exclusion : value;
    }

    private loadTestStrings(): Thenable<string[]> {
        this.evaluateTestDirectory();

        const exclusions = [];

        exclusions.push(this.loadExclusion("msbuildRootTestxUnitPrefix", "[xUnit.net"));
        exclusions.push(this.loadExclusion("msbuildRootTestMsg", "The following Tests are available:"));
        exclusions.push(this.loadExclusion("msbuildRootTestNotFoundMsg", "No test is available"));
        exclusions.push(this.loadExclusion("msbuildRootTestCopyrightPrefix", "Copyright (c) Microsoft Corporation.  All rights reserved."));
        exclusions.push(this.loadExclusion("msbuildRootTestVersionsPrefix", "Microsoft (R) Test Execution Command Line Tool Version"));
        exclusions.push(this.loadExclusion("msbuildRootTestRunForPrefix", "Test run for"));

        return new Promise((c, e) => {
            try {
                const testStrings = Executor
                    .execSync(`dotnet test -t -v=q ${this.enableBuild()} ${this.enableRestore()}`, this.testDirectoryPath)
                    .split(/[\r\n]+/g)
                    .filter((item) => item && exclusions.every((v) => !item.startsWith(v)))
                    .map((item) => item.trim());

                c(testStrings);

            } catch (error) {
                return e(["Please open or set the test project", "and ensure your project compiles."]);
            }

            return c([]);
        });
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
