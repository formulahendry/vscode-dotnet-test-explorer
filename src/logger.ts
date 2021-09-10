"use strict";
import * as vscode from "vscode";

export class Logger {
    public static LogRaw(message: string, output: string = this.defaultOutput): void {
        if (this.outputTerminals[output] === undefined ) {
            this.outputTerminals[output] = vscode.window.createOutputChannel(output);
        }

        this.outputTerminals[output].appendLine(message.trim());
    }

    public static Log(message: string): void {
        Logger.LogRaw(`[INFO] ${message}`);
    }

    public static LogError(message: string, error: any): void {
        Logger.LogRaw(`[ERROR] ${message} - ${Logger.formatError(error)}`);
    }

    public static LogWarning(message: string): void {
        Logger.LogRaw(`[WARNING] ${message}`);
    }

    public static Clear(output: string = this.defaultOutput): void {
        this.outputTerminals[output].clear();
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
