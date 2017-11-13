"use strict";
import * as fs from "fs";
import * as path from "path";
import { Disposable, EventEmitter, Event } from "vscode";
import { setTimeout } from "timers";
import { DOMParser } from "xmldom";
import { TestResult } from "./testResult"

function getAttributeValue(node, name: string): string {
    let attribute = node.attributes.getNamedItem(name);
    return (attribute === null) ? null : attribute.nodeValue;
}

export class TestResultsFile implements Disposable {
    private static readonly ResultsFileName = "TestExplorerResults.trx";
    private onNewResultsEmmitter = new EventEmitter<TestResult[]>();
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

    public get onNewResults(): Event<TestResult[]> {
        return this.onNewResultsEmmitter.event;
    }

    private parseResults(): void {
        console.log("Loading test results file '{0}'", this.resultsFile);
        fs.readFile(this.resultsFile, (err, data) => {
            if (err) {
                console.log("Error reading test results file: '{0}'", err);
            } else {
                let results: TestResult[] = [];
                const xdoc = new DOMParser().parseFromString(data.toString(), "application/xml");
                const nodes = xdoc.documentElement.getElementsByTagName("UnitTestResult");
                for (var i = 0; i < nodes.length; i++) {
                    results.push(new TestResult(
                        getAttributeValue(nodes[i], "testName"),
                        getAttributeValue(nodes[i], "outcome")
                    ));
                }

                this.onNewResultsEmmitter.fire(results);
            }
        });
    }
}
