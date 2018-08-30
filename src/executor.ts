"use strict";
import { exec, execSync } from "child_process";
import { platform } from "os";
import * as vscode from "vscode";

export class Executor {
    public static runInTerminal(command: string, cwd?: string, addNewLine: boolean = true, terminal: string = "Test Explorer"): void {
        if (this.terminals[terminal] === undefined ) {
            this.terminals[terminal] = vscode.window.createTerminal(terminal);
        }
        this.terminals[terminal].show();
        if (cwd) {
            this.terminals[terminal].sendText(`cd "${cwd}"`);
        }
        this.terminals[terminal].sendText(command, addNewLine);
    }

    public static exec(command: string, callback, cwd?: string) {
        return exec(this.handleWindowsEncoding(command), { encoding: "utf8", maxBuffer: 5120000, cwd }, callback);
    }

    public static execSync(command: string, cwd?: string) {
        return execSync(this.handleWindowsEncoding(command), { encoding: "utf8", maxBuffer: 5120000, cwd });
    }

    public static onDidCloseTerminal(closedTerminal: vscode.Terminal): void {
        delete this.terminals[closedTerminal.name];
    }

    private static terminals: { [id: string]: vscode.Terminal } = {};

    private static isWindows: boolean = platform() === "win32";

    private static handleWindowsEncoding(command: string): string {
        return this.isWindows ? `chcp 65001 | ${command}` : command;
    }

}
