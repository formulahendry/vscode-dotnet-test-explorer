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

export interface IWatchedDirectory {
    watcher: any;
    directory: string;
}

export class Watch implements vscode.Disposable {

    private watchedDirectories: IWatchedDirectory[] = [];

    constructor(
        private testCommands: TestCommands,
        private testDirectories: TestDirectories,
        private resultsFile: TestResultsFile) {
            if (Utility.getConfiguration().get<boolean>("autoWatch")) {

                this.testCommands.onTestDiscoveryFinished(this.setupWatcherForAllDirectories, this);
            }
        }

    public dispose(): void {
        try {
            this.watchedDirectories.forEach( (wd: IWatchedDirectory) => wd.watcher.close());
        } catch (err) {
        }
    }

    private setupWatcherForAllDirectories(): void {
        const allDirectories = this.testDirectories.getTestDirectories();

        for (let i = 0; i < allDirectories.length; i++) {
            this.setupWatch(allDirectories[i], this.getNamespaceForTestDirectory(allDirectories[i]), i);
        }
    }

    private setupWatch(testDirectory: string, namespaceForDirectory: string, index: number) {

        if (this.watchedDirectories.some( (wd) => wd.directory === testDirectory)) {
            Logger.Log("Skipping adding watch since already watching directory " + testDirectory);
            return;
        }

        Logger.Log("Starting watch for " + testDirectory);

        const tempFolder = fs.mkdtempSync(path.join(Utility.pathForResultFile, "test-explorer-"));
        const trxPath = path.join(tempFolder, `autoWatch${index}.trx`);

        const me = this;

        const watcher = chokidar.watch(trxPath).on("all", () => {
            me.resultsFile.parseResults(trxPath)
                .then( (testResults) => {
                    me.testCommands.sendNewTestResults({testName: namespaceForDirectory, testResults});

                    try {
                        if (fs.existsSync(trxPath)) {
                            fs.unlinkSync(trxPath);
                        }
                    } catch (err) {}
                });
        });

        this.watchedDirectories.push({watcher, directory: testDirectory});

        AppInsightsClient.sendEvent("runWatchCommand");
        const command = `dotnet watch test${Utility.additionalArgumentsOption} --logger "trx;LogFileName=${trxPath}"`;

        Logger.Log(`Executing ${command} in ${testDirectory}`);
        const p = Executor.exec(command, (err: any, stdout: string) => {
            Logger.Log(stdout);
        }, testDirectory, true);

        p.stdout.on("data", (buf) => {
            const stdout = String(buf);
            Logger.Log(stdout);

            // Only notify that test are running when a watch has triggered due to changes
            if (stdout.indexOf("watch : Started") > -1) {
                this.testCommands.watchRunningTests(namespaceForDirectory);
            }
        });

        p.stdout.on("close", (buf: any) => {
            Logger.Log("Stopping watch");

            this.watchedDirectories = this.watchedDirectories.filter( (wd) => wd.directory !== testDirectory);
        });
    }

    private getNamespaceForTestDirectory(testDirectory: string) {
        const firstTestForDirectory = this.testDirectories.getFirstTestForDirectory(testDirectory);
        return firstTestForDirectory.substring(0, firstTestForDirectory.indexOf(".") - 1);
    }
}
