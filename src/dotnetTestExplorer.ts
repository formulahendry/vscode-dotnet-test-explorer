import * as path from "path";
import * as vscode from "vscode";
import { Executor } from "./executor";

export class DotnetTestExplorer implements vscode.TreeDataProvider<vscode.TreeItem> {
    constructor(context: vscode.ExtensionContext) {
    }

    public getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    public getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
        let tests = [new vscode.TreeItem("Please open or set the test project")];
        const testStrings = Executor.execSync("dotnet test -t", vscode.workspace.rootPath)
            .split(/[\r\n]+/g).filter((item) => item);
        const index = testStrings.indexOf("The following Tests are available:");
        if (index > -1) {
            tests = testStrings.slice(index + 1).map((item) => new vscode.TreeItem(item.trim()));
        }

        return Promise.resolve(tests);
    }
}
