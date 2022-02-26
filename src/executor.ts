"use strict";
import { ChildProcess, exec, ExecException, ExecOptions } from "child_process";
import { platform } from "os";
import * as vscode from "vscode";
import { Debug, IDebugRunnerInfo } from "./debug";
import { Logger } from "./logger";
import { ObjectEncodingOptions } from "fs";

export interface IProcessOutput {
    error: ExecException;
    stdout: string;
    stderr: string;
}

export class Executor {
    private static defaultOptions: ObjectEncodingOptions & ExecOptions = {
        encoding: "utf8",
        maxBuffer: 512000
    };
    private static defaultEnv: NodeJS.ProcessEnv = {
        DOTNET_CLI_UI_LANGUAGE: "en",
        VSTEST_HOST_DEBUG: "0",
        ...process.env
    };
    public static spawn(command: string, cwd?: string): ChildProcess {
        const options = {
            ...this.defaultOptions,
            env: this.defaultEnv,
            cwd
        };
        return this.execInternal(command, options, () => null);
    }
    public static exec(command: string,
        cwd?: string): Promise<IProcessOutput> {
        const options = {
            ...this.defaultOptions,
            env: this.defaultEnv,
            cwd
        };
        return new Promise<IProcessOutput>((resolve) => {
            this.execInternal(command, options, (error, stdout, stderr) => resolve({ error, stdout, stderr }))
        });
    }

    public static debug(command: string, cwd?: string) {
        const options = {
            ...this.defaultOptions,
            env: {
                ...this.defaultEnv,
                VSTEST_HOST_DEBUG: "1"
            },
            cwd
        };

        return new Promise<IProcessOutput>((resolve) => {
            const childProcess = this.execInternal(command, options, (error, stdout, stderr) => resolve({ error, stdout, stderr }))

            if (this.debugRunnerInfo && this.debugRunnerInfo.isSettingUp) {
                Logger.Log("Debugger already running");
                return;
            }

            const debug = new Debug();

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
            });
        });

    }

    private static execInternal(command: string,
        options: ObjectEncodingOptions & ExecOptions,
        callback: (error: ExecException, stdout: string, stderr: string) => void): ChildProcess {
        Logger.Log(`Executing ${command} in ${options.cwd}`);
        const childProcess = exec(this.handleWindowsEncoding(command), options, callback);

        Logger.Log(`Process ${childProcess.pid} started`);

        this.processes.add(childProcess);
        childProcess.on("close", (code: number) => {
            if (this.processes.has(childProcess)) {
                this.processes.delete(childProcess);
                Logger.Log(`Process ${childProcess.pid} finished`);
            }
        });
        childProcess.stdout.on("data", chunk => Logger.Log(chunk));
        childProcess.stderr.on("data", chunk => Logger.Log(chunk));
        return childProcess;
    }

    public static async stop() {
        this.debugRunnerInfo = null;
        const processes = [...this.processes];
        this.processes.clear();
        await Promise.all(processes.map(p => this.terminate(p)));
    }

    private static debugRunnerInfo: IDebugRunnerInfo;

    private static isWindows: boolean = platform() === "win32";

    private static processes = new Set<ChildProcess>();

    private static handleWindowsEncoding(command: string): string {
        return this.isWindows ? `chcp 65001 | ${command}` : command;
    }

    /** Tries to gracefully terminate a process. If it's not done after a timeout, kill it instead. */
    public static async terminate(process: ChildProcess, killTimeout: number = 3000) {
        return new Promise<void>((resolve) => {
            process.on("exit", () => resolve());
            Logger.Log(`Trying to terminate process ${process.pid}...`)
            process.kill("SIGTERM");
            setTimeout(() => {
                if (typeof process.exitCode !== "number") {
                    Logger.LogWarning(`Process ${process.pid} does not react. Killing...`)
                    process.kill("SIGKILL");
                }
            }, 3000);
            if (typeof process.exitCode === "number")
                resolve();
        });
    }
}
