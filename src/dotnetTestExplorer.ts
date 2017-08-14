import * as path from "path";
import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { Executor } from "./executor";
import { Utility } from "./utility";

export class DotnetTestExplorer implements vscode.TreeDataProvider<vscode.TreeItem> {
    public _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    public readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;
    private cwd;

    constructor(private context: vscode.ExtensionContext) {
    }

    public getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    public getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        let tests = [];

        try {
            const testProjectPath = Utility.getConfiguration().get<string>("testProjectPath");
            let testProjectFullPath = testProjectPath ? testProjectPath : vscode.workspace.rootPath;
            if (!path.isAbsolute(testProjectFullPath)) {
                testProjectFullPath = path.resolve(vscode.workspace.rootPath, testProjectPath);
            }
            this.cwd  = testProjectFullPath;
            const testStrings = Executor.execSync("dotnet test -t", this.cwd)
                .split(/[\r\n]+/g).filter((item) => item);
            const index = testStrings.indexOf("The following Tests are available:");
            if (index > -1) {
                tests = testStrings.slice(index + 1).map((item) => {
                    const test = new vscode.TreeItem(item.trim());
                    test.iconPath = {
                        dark: this.context.asAbsolutePath(path.join("resources", "dark", "run.png")),
                        light: this.context.asAbsolutePath(path.join("resources", "light", "run.png")),
                    };
                    return test;
                });
            }
        } catch (error) {
            tests = [new vscode.TreeItem("Please open or set the test project")];
        }

        return Promise.resolve(tests);
    }

    public refreshTestExplorer(): void {
        this._onDidChangeTreeData.fire();
        AppInsightsClient.sendEvent("refreshTestExplorer");
    }

    public runAllTests(): void {
        Executor.runInTerminal("dotnet test", this.cwd);
        AppInsightsClient.sendEvent("runAllTests");
    }

    public runTest(methodName: string): void {
        Executor.runInTerminal(`dotnet test --filter Name=${methodName}`, this.cwd);
        AppInsightsClient.sendEvent("runTest");
    }
}
