import * as chokidar from "chokidar";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { Executor } from "./executor";
import { Logger } from "./logger";
import { TestCommands } from "./testCommands";
import { TestDirectories } from "./testDirectories";
import { TestResultsFile } from "./testResultsFile";
import { Utility } from "./utility";

export class Watch implements vscode.Disposable {

    private trxPath: string;
    private watcher;

    constructor(
        private testCommands: TestCommands,
        private testDirectories: TestDirectories,
        private resultsFile: TestResultsFile) {
            if (Utility.getConfiguration().get<boolean>("autoWatch")) {
                this.testCommands.onTestDiscoveryFinished(this.setupWatch, this);
            }
        }

    public dispose(): void {
        try {
            if (this.watcher) {
                this.watcher.close();
            }

            if (this.trxPath) {
                // When we ask for a random directory it creates one for us,
                // however, we can't delete it if there's a file inside of it
                if (fs.existsSync(this.trxPath)) {
                    fs.unlinkSync(this.trxPath);
                }

                fs.rmdirSync(path.dirname(this.trxPath));
            }

        } catch (err) {
        }
    }

    private setupWatch() {

        if (this.watcher) {
            return;
        }

        const testDirectory = this.testDirectories.getTestDirectories()[0];

        const tempFolder = fs.mkdtempSync(path.join(Utility.pathForResultFile, "test-explorer-"));
        this.trxPath = path.join(tempFolder, "autoWatch.trx");

        const me = this;

        this.watcher = chokidar.watch(this.trxPath).on("all", () => {
            me.resultsFile.parseResults(me.trxPath)
                .then( (testResults) => {
                    me.testCommands.sendNewTestResults({testName: "", testResults});
                });
        });

        AppInsightsClient.sendEvent("runWatchCommand");
        const command = `dotnet watch test${Utility.additionalArgumentsOption} --logger "trx;LogFileName=${this.trxPath}"`;

        Logger.Log(`Executing ${command} in ${testDirectory}`);
        Executor.runInTerminal(command, testDirectory);
    // }
    }
}
