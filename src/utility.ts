"use strict";
import * as vscode from "vscode";

export class Utility {
    public static codeLensEnabled(): boolean {
        return Utility.getConfiguration().get<boolean>("showCodeLens", true);
    }

    public static getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration("dotnet-test-explorer");
    }
}
