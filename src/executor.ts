"use strict";
import { ChildProcess, exec } from "child_process";
import { platform } from "os";
import * as vscode from "vscode";
import { Debug, IDebugRunnerInfo } from "./debug";
import { Logger } from "./logger";

export class Executor {

    public static runInTerminal(command: string, cwd?: string, addNewLine: boolean = true, terminal: string = ".NET Test Explorer"): void {
        if (this.terminals[terminal] === undefined) {
            this.terminals[terminal] = vscode.window.createTerminal(terminal);
        }
        this.terminals[terminal].show();
        if (cwd) {
            this.terminals[terminal].sendText(`cd "${cwd}"`);
        }
        this.terminals[terminal].sendText(command, addNewLine);
    }

    public static exec(command: string, callback, cwd?: string, addToProcessList?: boolean) {
        // DOTNET_CLI_UI_LANGUAGE does not seem to be respected when passing it as a parameter to the exec
        // function so we set the variable here instead
        process.env.DOTNET_CLI_UI_LANGUAGE = "en";
        process.env.VSTEST_HOST_DEBUG = "0";

        const childProcess = exec(this.handleWindowsEncoding(command), { encoding: "utf8", maxBuffer: 5120000, cwd }, callback);

        if (addToProcessList) {

            Logger.Log(`Process ${childProcess.pid} started`);

            this.processes.push(childProcess);

            childProcess.on("close", (code: number) => {

                const index = this.processes.map((p) => p.pid).indexOf(childProcess.pid);
                if (index > -1) {
                    this.processes.splice(index, 1);
                    Logger.Log(`Process ${childProcess.pid} finished`);
                }
            });
        }

        return childProcess;
    }

    public static debug(command: string, callback, cwd?: string, addToProcessList?: boolean) {
        // DOTNET_CLI_UI_LANGUAGE does not seem to be respected when passing it as a parameter to the exec
        // function so we set the variable here instead
        process.env.DOTNET_CLI_UI_LANGUAGE = "en";
        process.env.VSTEST_HOST_DEBUG = "1";

        const childProcess = exec(this.handleWindowsEncoding(command), { encoding: "utf8", maxBuffer: 5120000, cwd }, callback);

        if (this.debugRunnerInfo && this.debugRunnerInfo.isSettingUp) {
            Logger.Log("Debugger already running");
            return;
        }

        const debug = new Debug();

        if (addToProcessList) {

            Logger.Log(`Process ${childProcess.pid} started`);

            this.processes.push(childProcess);

            childProcess.stdout.on("data", (buf) => {

                if (this.debugRunnerInfo && this.debugRunnerInfo.isRunning) {
                    return;
                }

                Logger.Log(`Waiting for debugger to attach`);

                const stdout = String(buf);

                this.debugRunnerInfo = debug.onData(stdout, this.debugRunnerInfo);

                if (this.debugRunnerInfo.config) {

                    Logger.Log(`Debugger process found, attaching`);

                    this.debugRunnerInfo.isRunning = true;

                    vscode.debug.startDebugging(vscode.workspace.workspaceFolders[0], this.debugRunnerInfo.config).then( (c) => {
                        // When we attach to the debugger it seems to be stuck before loading the actual assembly that's running in code
                        // This is to try to continue past this invisible break point and into the actual code the user wants to debug
                        setTimeout(() => {
                            vscode.commands.executeCommand("workbench.action.debug.continue");
                        }, 1000);
                    });
                }
            });

            childProcess.on("close", (code: number) => {

                Logger.Log(`Debugger finished`);

                this.debugRunnerInfo = null;

                vscode.commands.executeCommand("workbench.view.extension.test", "workbench.view.extension.test");

                const index = this.processes.map((p) => p.pid).indexOf(childProcess.pid);
                if (index > -1) {
                    this.processes.splice(index, 1);
                    Logger.Log(`Process ${childProcess.pid} finished`);
                }
            });
        }

        return childProcess;
    }

    public static onDidCloseTerminal(closedTerminal: vscode.Terminal): void {
        delete this.terminals[closedTerminal.name];
    }

    public static stop() {
        this.processes.forEach((p) => {
            Logger.Log(`Stop processes requested - ${p.pid} stopped`);
            p.kill("SIGKILL");
        });

        this.processes = [];
        this.debugRunnerInfo = null;
    }

    private static debugRunnerInfo: IDebugRunnerInfo;

    private static terminals: { [id: string]: vscode.Terminal } = {};

    private static isWindows: boolean = platform() === "win32";

    private static processes: ChildProcess[] = [];

    private static handleWindowsEncoding(command: string): string {
        return this.isWindows ? `chcp 65001 | ${command}` : command;
    }
}
