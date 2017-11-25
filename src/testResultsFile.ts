"use strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { setTimeout } from "timers";
import { Disposable, Event, EventEmitter } from "vscode";
import { DOMParser, Element, Node } from "xmldom";
import { TestResult } from "./testResult";

function findChildElement(node: Node, name: string): Node {
    let child = node.firstChild;
    while (child) {
        if (child.nodeName === name) {
            return child;
        }

        child = child.nextSibling;
    }

    return null;
}

function getAttributeValue(node: Node, name: string): string {
    const attribute = node.attributes.getNamedItem(name);
    return (attribute === null) ? null : attribute.nodeValue;
}

function parseUnitTestResults(xml: Element): TestResult[] {
    const results: TestResult[] = [];
    const nodes = xml.getElementsByTagName("UnitTestResult");

    // TSLint wants to use for-of here, but nodes doesn't support it
    for (let i = 0; i < nodes.length; i++) { // tslint:disable-line
        results.push(new TestResult(
            getAttributeValue(nodes[i], "testId"),
            getAttributeValue(nodes[i], "outcome"),
        ));
    }

    return results;
}

function updateUnitTestDefinitions(xml: Element, results: TestResult[]): void {
    const nodes = xml.getElementsByTagName("UnitTest");
    const names = new Map<string, any>();

    for (let i = 0; i < nodes.length; i++) { // tslint:disable-line
        const id = getAttributeValue(nodes[i], "id");
        const testMethod = findChildElement(nodes[i], "TestMethod");
        if (testMethod) {
            names.set(id, {
                className: getAttributeValue(testMethod, "className"),
                method: getAttributeValue(testMethod, "name"),
            });
        }
    }

    for (const result of results) {
        const name = names.get(result.id);
        if (name) {
            result.updateName(name.className, name.method);
        }
    }
}

export class TestResultsFile implements Disposable {
    private static readonly ResultsFileName = "Results.trx";
    private onNewResultsEmitter = new EventEmitter<TestResult[]>();
    private resultsFile: string;
    private watcher: fs.FSWatcher;

    public dispose(): void {
        try {
            if (this.watcher) {
                this.watcher.close();
            }

            if (this.resultsFile) {
                // When we ask for a random directory it creates one for us,
                // however, we can't delete it if there's a file inside of it
                if (fs.existsSync(this.resultsFile)) {
                    fs.unlinkSync(this.resultsFile);
                }

                fs.rmdir(path.dirname(this.resultsFile));
            }
        } catch (error) {
        }
    }

    public get fileName(): string {
        this.ensureTemproaryPathExists();
        return this.resultsFile;
    }

    public get onNewResults(): Event<TestResult[]> {
        return this.onNewResultsEmitter.event;
    }

    private ensureTemproaryPathExists(): void {
        if (!this.resultsFile) {
            const tempFolder = fs.mkdtempSync(path.join(os.tmpdir(), "test-explorer-"));
            this.resultsFile = path.join(tempFolder, TestResultsFile.ResultsFileName);
            this.watchFolder(tempFolder);
        }
    }

    private parseResults(): void {
        const emitter = this.onNewResultsEmitter;
        fs.readFile(this.resultsFile, (err, data) => {
            if (!err) {
                const xdoc = new DOMParser().parseFromString(data.toString(), "application/xml");
                const results = parseUnitTestResults(xdoc.documentElement);
                updateUnitTestDefinitions(xdoc.documentElement, results);
                emitter.fire(results);
            }
        });
    }

    private watchFolder(folder: string): void {
        // The change event gets called multiple times, so use a one-second
        // delay before we read anything to avoid doing too much work
        const me = this;
        let changeDelay: NodeJS.Timer;
        this.watcher = fs.watch(folder, (eventType, fileName) => {
            if (fileName === TestResultsFile.ResultsFileName) {
                clearTimeout(changeDelay);
                changeDelay = setTimeout(() => {
                    me.parseResults();
                }, 1000);
            }
        });
    }
}
