"use strict";
import * as vscode from "vscode";

export class Logger {
    public static Log(message: string, output: string = this.defaultOutput): void {
        if (this.outputTerminals[output] === undefined ) {
            this.outputTerminals[output] = vscode.window.createOutputChannel(output);
        }

        this.outputTerminals[output].appendLine(message);
    }

    public static LogError(message: string, error: any): void {
        Logger.Log(`[ERROR] ${message} - ${Logger.formatError(error)}`);
    }

    public static LogWarning(message: string): void {
        Logger.Log(`[WARNING] ${message}`);
    }

    public static Show(): void {
        if (this.outputTerminals && this.outputTerminals[this.defaultOutput]) {
            this.outputTerminals[this.defaultOutput].show();
        }
    }

    private static defaultOutput = ".NET Test Explorer";

    private static outputTerminals: { [id: string]: vscode.OutputChannel } = {};

    private static formatError(error: any): string {
        if (error && error.stack) {
            return error.stack;
        }

        return error || "";
    }
}
