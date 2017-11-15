"use strict";
import * as fs from "fs";
import * as path from "path";
import { setTimeout } from "timers";
import { Disposable, Event, EventEmitter } from "vscode";
import { DOMParser } from "xmldom";
import { TestResult } from "./testResult";

function getAttributeValue(node, name: string): string {
    const attribute = node.attributes.getNamedItem(name);
    return (attribute === null) ? null : attribute.nodeValue;
}

export class TestResultsFile implements Disposable {
    private static readonly ResultsFileName = "TestExplorerResults.trx";
    private onNewResultsEmitter = new EventEmitter<TestResult[]>();
    private resultsFile: string;
    private watcher: fs.FSWatcher;

    public constructor() {
        const tempFolder = process.platform === "win32" ? process.env.TEMP : "/tmp";
        this.resultsFile = path.join(tempFolder, TestResultsFile.ResultsFileName);

        // The change event gets called multiple times, so use a one-second
        // delay before we read anything to avoid doing too much work
        const me = this;
        let changeDelay: NodeJS.Timer;
        this.watcher = fs.watch(tempFolder, (eventType, fileName) => {
            if ((fileName === TestResultsFile.ResultsFileName) && (eventType === "change")) {
                clearTimeout(changeDelay);
                changeDelay = setTimeout(() => {
                    me.parseResults();
                }, 1000);
            }
        });
    }

    public dispose(): void {
        try {
            this.watcher.close();
            fs.unlinkSync(this.resultsFile);
        } catch (error) {
        }
    }

    public get fileName(): string {
        return this.resultsFile;
    }

    public get onNewResults(): Event<TestResult[]> {
        return this.onNewResultsEmitter.event;
    }

    private parseResults(): void {
        const emitter = this.onNewResultsEmitter;
        fs.readFile(this.resultsFile, (err, data) => {
            if (!err) {
                const results: TestResult[] = [];
                const xdoc = new DOMParser().parseFromString(data.toString(), "application/xml");
                const nodes = xdoc.documentElement.getElementsByTagName("UnitTestResult");

                // TSLint wants to use for-of here, but nodes doesn't support it
                for (let i = 0; i < nodes.length; i++) { // tslint:disable-line
                    results.push(new TestResult(
                        getAttributeValue(nodes[i], "testName"),
                        getAttributeValue(nodes[i], "outcome"),
                    ));
                }

                emitter.fire(results);
            }
        });
    }
}
