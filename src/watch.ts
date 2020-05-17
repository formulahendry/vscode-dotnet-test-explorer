import * as path from "path";
import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { Executor } from "./executor";
import { Logger } from "./logger";
import { TestCommands } from "./testCommands";
import { TestDirectories } from "./testDirectories";
import { TestResultsFile } from "./testResultsFile";
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

        if (this.watchedDirectories.some( (wd) => wd === testDirectory)) {
            Logger.Log("Skipping adding watch since already watching directory " + testDirectory);
            return;
        }

        Logger.Log("Starting watch for " + testDirectory);

        const trxPath = path.join(this.testCommands.testResultFolder, `autoWatch${index}.trx`);

        AppInsightsClient.sendEvent("runWatchCommand");
        const command = `dotnet watch test ${Utility.additionalArgumentsOption} --logger "trx;LogFileName=${trxPath}"`;

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

            this.watchedDirectories = this.watchedDirectories.filter( (wd) => wd !== testDirectory);
        });
    }

    private getNamespaceForTestDirectory(testDirectory: string) {
        const firstTestForDirectory = this.testDirectories.getFirstTestForDirectory(testDirectory);
        return firstTestForDirectory.substring(0, firstTestForDirectory.indexOf(".") - 1);
    }
}
