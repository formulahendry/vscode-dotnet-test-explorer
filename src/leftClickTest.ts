import * as vscode from "vscode";
import { Utility } from "./utility";
import { TreeNode } from "./treeNodes/treeNode";

export class LeftClickTest {
    public handle(test: TreeNode): void {
        const leftClickAction = Utility.getConfiguration().get<string>("leftClickAction");
        if (leftClickAction === "gotoTest") {
            vscode.commands.executeCommand("dotnet-test-explorer.gotoTest", test);
        } else if (leftClickAction === "runTest") {
            vscode.commands.executeCommand("dotnet-test-explorer.runTest", test);
        }
    }
}
