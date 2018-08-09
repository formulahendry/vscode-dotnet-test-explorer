import * as vscode from "vscode";
import { TestNode } from "./testNode";
import { Utility } from "./utility";

export class LeftClickTest {
    public handle(test: TestNode): void {
        const leftClickAction = Utility.getConfiguration().get<string>("leftClickAction");
        if (leftClickAction === "gotoTest") {
            vscode.commands.executeCommand("dotnet-test-explorer.gotoTest", test);
        } else if (leftClickAction === "runTest") {
            vscode.commands.executeCommand("dotnet-test-explorer.runTest", test);
        }
    }
}
