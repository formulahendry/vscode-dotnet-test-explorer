import * as path from "path";
import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { Executor } from "./executor";
import { Logger } from "./logger";
import { TestCommands } from "./testCommands";
import { TestDirectories } from "./testDirectories";
import { parseResults } from "./testResultsFile";
import { Utility } from "./utility";

export class Watch {

    private watchedDirectories: string[] = [];

    constructor(
        private testCommands: TestCommands,
        private testDirectories: TestDirectories) {
        if (Utility.getConfiguration().get<boolean>("autoWatch")) {

            this.testCommands.onTestDiscoveryFinished(this.setupWatcherForAllDirectories, this);
        }
    }

    private setupWatcherForAllDirectories(): void {
        const allDirectories = this.testDirectories.getTestDirectories();

        for (let i = 0; i < allDirectories.length; i++) {
            this.setupWatch(allDirectories[i], this.getNamespaceForTestDirectory(allDirectories[i]), i);
        }
    }

    private setupWatch(testDirectory: string, namespaceForDirectory: string, index: number) {

        if (this.watchedDirectories.some((wd) => wd === testDirectory)) {
            Logger.Log("Skipping adding watch since already watching directory " + testDirectory);
            return;
        }

        Logger.Log("Starting watch for " + testDirectory);

        const trxPath = path.join(this.testCommands.testResultFolder, `autoWatch${index}.trx`);

        AppInsightsClient.sendEvent("runWatchCommand");
        const command = `dotnet watch test ${Utility.additionalArgumentsOption}`
            + ` --verbosity:quiet` // be less verbose to avoid false positives when parsing output
            + ` --logger "trx;LogFileName=${trxPath}"`;

        Logger.Log(`Executing ${command} in ${testDirectory}`);
        const p = Executor.exec(command, (err: any, stdout: string) => {
            Logger.Log(stdout);
        }, testDirectory, true);

        let startedLine = [];
        p.stdout.on("data", async (buf) => {
            const stdout = String(buf);

            // The string contained in `buf` may contain less or more
            // than one line. But we want to parse lines as a whole.
            // Consequently, we have to join them.
            const lines = [];
            let lastLineStart = 0;
            for (let i = 0; i < stdout.length; i++) {
                const c = stdout[i];
                if (c === "\r" || c === "\n") {
                    startedLine.push(stdout.substring(lastLineStart, i));
                    const line = startedLine.join("");
                    startedLine = [];
                    lines.push(line);
                    if (c === "\r" && stdout[i + 1] === "\n") {
                        i++;
                    }
                    lastLineStart = i + 1;
                }
            }
            startedLine.push(stdout.substring(lastLineStart, stdout.length));

            // Parse the output.
            for (const line of lines) {
                Logger.Log(`dotnet watch: ${line}`);

                if (line === "watch : Started") {
                    this.testCommands.sendRunningTest({ testName: namespaceForDirectory, isSingleTest: false });
                } else if (line === `Results File: ${trxPath}`) {
                    Logger.Log("Results file detected.");
                    const results = await parseResults(trxPath);
                    this.testCommands.sendNewTestResults({ clearPreviousTestResults: false, testResults: results });
                } else if (line.indexOf(": error ") > -1) {
                    this.testCommands.sendBuildFailed({ testName: namespaceForDirectory, isSingleTest: false });
                }
            }
        });

        p.stdout.on("close", (buf: any) => {
            Logger.Log("Stopping watch");

            this.watchedDirectories = this.watchedDirectories.filter((wd) => wd !== testDirectory);
        });
    }

    private getNamespaceForTestDirectory(testDirectory: string) {
        const firstTestForDirectory = this.testDirectories.getFirstTestForDirectory(testDirectory);
        return firstTestForDirectory.substring(0, firstTestForDirectory.indexOf(".") - 1);
    }
}
