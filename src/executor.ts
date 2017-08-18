"use strict";
import { exec, execSync } from "child_process";
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

    public static exec(command: string) {
        return exec(command);
    }

    public static execSync(command: string, cwd?: string) {
        return execSync(command, { encoding: "utf8", cwd });
    }

    public static onDidCloseTerminal(closedTerminal: vscode.Terminal): void {
        delete this.terminals[closedTerminal.name];
    }

    private static terminals: { [id: string]: vscode.Terminal } = {};
}
