"use strict";

import * as vscode from "vscode";
import { DotnetTestExplorer } from "./dotnetTestExplorer";

export function activate(context: vscode.ExtensionContext) {
    const dotnetTestExplorer = new DotnetTestExplorer(context);
    vscode.window.registerTreeDataProvider("dotnetTestExplorer", dotnetTestExplorer);
}

export function deactivate() {
}
