"use strict";
import * as vscode from "vscode";

export class Logger {
    public static Log(message: string, output: string = "Test Explorer"): void {
        if (this.outputTerminals[output] === undefined ) {
            this.outputTerminals[output] = vscode.window.createOutputChannel(output);
        }

        this.outputTerminals[output].appendLine(message);
    }

    private static outputTerminals: { [id: string]: vscode.OutputChannel } = {};
}
