import * as path from "path";
import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { Executor } from "./executor";
import { Logger } from "./logger";
import { TestCommands } from "./testCommands";
import { TestDirectories } from "./testDirectories";
import { Utility } from "./utility";
import { ChildProcess } from "child_process";

export class Watch {
    private processes = new Map<string, ChildProcess>();

    constructor(
        private testCommands: TestCommands,
        private testDirectories: TestDirectories) {
        if (Utility.getConfiguration().get<boolean>("autoWatch")) {

            this.testCommands.onTestDiscoveryFinished(this.startWatch, this);
        }
    }

    private async startWatch() {
        for (const testDirectory of this.testDirectories.getTestDirectories()) {
            Logger.Log("Starting watch for " + testDirectory);

            const existingProcess = this.processes.get(testDirectory);
            if (existingProcess !== undefined && existingProcess.exitCode === null) {
                Logger.Log(`It seems like a process for ${testDirectory} is already running - it will be killed.`);
                existingProcess.kill("SIGKILL");
            }

            AppInsightsClient.sendEvent("runWatchCommand");
            const command = `dotnet watch test ${Utility.additionalArgumentsOption} `
                + `--verbosity:quiet `
                + `--test-adapter-path "${this.testCommands.loggerPath}" `
                + `--logger "VsCodeLogger;port=${this.testCommands.loggerServer.port}" `;

            const listener = this.testCommands.loggerServer.onMessage((message) => {
                if (message.type === "testRunStarted") {
                    this.testCommands.sendRunningTest({ isSingleTest: false, testName: "" });
                }
                else if (message.type === "testRunComplete") {
                    Logger.Log("Test run complete.")
                }
            });

            Logger.Log(`Executing ${command} in ${testDirectory}`);
            const watcher = Executor.spawn(command, testDirectory);
            watcher.on("exit", () => listener.dispose());
            this.processes.set(testDirectory, watcher);
        }
    }
}
