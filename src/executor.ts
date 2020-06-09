"use strict";
import { ChildProcess, exec, ExecException, ExecOptions } from "child_process";
import { platform } from "os";
import * as vscode from "vscode";
import { Debug, IDebugRunnerInfo } from "./debug";
import { Logger } from "./logger";
import { BaseEncodingOptions } from "fs";

export class Executor {
    private static defaultOptions: BaseEncodingOptions & ExecOptions = {
        encoding: "utf8",
        maxBuffer: 512000
    };
    private static defaultEnv: NodeJS.ProcessEnv = {
        DOTNET_CLI_UI_LANGUAGE: "en",
        VSTEST_HOST_DEBUG: "0"
    };
    public static exec(command: string,
        callback: (error: ExecException, stdout: string, stderr: string) => void,
        cwd?: string) {
        const options = {
            ...this.defaultOptions,
            env: this.defaultEnv,
            cwd
        };
        const childProcess = exec(this.handleWindowsEncoding(command), options, callback);

        Logger.Log(`Process ${childProcess.pid} started`);

        this.processes.add(childProcess);
        childProcess.on("close", (code: number) => {
            if (this.processes.has(childProcess)) {
                this.processes.delete(childProcess);
                Logger.Log(`Process ${childProcess.pid} finished`);
            }
        });

        return childProcess;
    }

    public static debug(command: string, callback: (error: ExecException, stdout: string, stderr: string) => void, cwd?: string) {
        const options = {
            ...this.defaultOptions,
            env: {
                ...this.defaultEnv,
                VSTEST_HOST_DEBUG: "1"
            },
            cwd
        };
        const childProcess = exec(this.handleWindowsEncoding(command), options, callback);

        if (this.debugRunnerInfo && this.debugRunnerInfo.isSettingUp) {
            Logger.Log("Debugger already running");
            return;
        }

        const debug = new Debug();

        Logger.Log(`Process ${childProcess.pid} started`);

        this.processes.add(childProcess);

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

                vscode.debug.startDebugging(vscode.workspace.workspaceFolders[0], this.debugRunnerInfo.config).then((c) => {
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

            if (this.processes.has(childProcess)) {
                this.processes.delete(childProcess);
                Logger.Log(`Process ${childProcess.pid} finished`);
            }
        });

        return childProcess;
    }

    public static stop() {
        for (const process of this.processes) {
            Logger.Log(`Stop processes requested - ${process.pid} stopped`);
            process.kill("SIGKILL");
        }
        this.processes.clear();
        this.debugRunnerInfo = null;
    }

    private static debugRunnerInfo: IDebugRunnerInfo;

    private static isWindows: boolean = platform() === "win32";

    private static processes = new Set<ChildProcess>();

    private static handleWindowsEncoding(command: string): string {
        return this.isWindows ? `chcp 65001 | ${command}` : command;
    }
}
