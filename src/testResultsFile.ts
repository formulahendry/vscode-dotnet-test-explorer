"use strict";
import * as fs from "fs";
import * as path from "path";
import { Disposable, EventEmitter, Event } from "vscode";
import { setTimeout } from "timers";

export class TestResultsFile implements Disposable {
    private static readonly ResultsFileName = "TestExplorerResults.trx";
    private onResultsUpdatedEmmitter = new EventEmitter<void>();
    private resultsFile: string;
    private watcher: fs.FSWatcher;

    public constructor() {
        const tempFolder = process.platform === "win32" ? process.env["TEMP"] : "/tmp";
        this.resultsFile = path.join(tempFolder, TestResultsFile.ResultsFileName);

        // The change event gets called multiple times, so use a one-second
        // delay before we read anything to avoid doing too much work
        let me = this;
        let timeout: NodeJS.Timer;
        this.watcher = fs.watch(tempFolder, (eventType, fileName) => {
            if ((fileName == TestResultsFile.ResultsFileName) && (eventType == "change")) {
                if (!timeout) {
                    timeout = setTimeout(() => {
                        timeout = null;
                        me.parseResults();
                    }, 1000);
                }
            }
        });
    }

    public dispose(): void {
        try {
            this.watcher.close();
            fs.unlinkSync(this.resultsFile);
        } catch {
        }
    }

    public get fileName(): string {
        return this.resultsFile;
    }

    public get onResultsUpdated(): Event<void> {
        return this.onResultsUpdatedEmmitter.event;
    }

    private parseResults(): void {
        console.log("Test results has changed.");
        this.onResultsUpdatedEmmitter.fire();
    }
}
