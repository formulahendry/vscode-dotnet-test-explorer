"use strict";
import * as fs from "fs";
import { Disposable } from "vscode";
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

function getTextContentForTag(parentNode: Node, tagName: string): string {
    const node = parentNode.getElementsByTagName(tagName);
    return node.length > 0 ? node[0].textContent : "";
}

function parseUnitTestResults(xml: Element): TestResult[] {
    const results: TestResult[] = [];
    const nodes = xml.getElementsByTagName("UnitTestResult");

    // TSLint wants to use for-of here, but nodes doesn't support it
    for (let i = 0; i < nodes.length; i++) { // tslint:disable-line

        results.push(new TestResult(
            getAttributeValue(nodes[i], "testId"),
            getAttributeValue(nodes[i], "outcome"),
            getTextContentForTag(nodes[i], "Message"),
            getTextContentForTag(nodes[i], "StackTrace"),
        ));
    }

    return results;
}

function updateUnitTestDefinitions(xml: Element, results: TestResult[]): void {
    const nodes = xml.getElementsByTagName("UnitTest");
    const names = new Map<string, any>();

    for (let i = 0; i < nodes.length; i++) { // tslint:disable-line
        const id = getAttributeValue(nodes[i], "id");
        const name = getAttributeValue(nodes[i], "name");
        const testMethod = findChildElement(nodes[i], "TestMethod");
        if (testMethod) {
            const isXUnit = getAttributeValue(testMethod, "adapterTypeName").toLowerCase().includes("xunit");
            let className = getAttributeValue(testMethod, "className");
            let method = getAttributeValue(testMethod, "name");
            const shouldSplitName = isXUnit && !name.startsWith(className);
            if (shouldSplitName) {
                const parts = name.split(".");
                if (parts.length > 0) {
                    className = parts.slice(0, parts.length - 1).join(".");
                    method = parts[parts.length - 1];
                }
            }
            names.set(id, {
                className,
                method,
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

export class TestResultsFile {

    public parseResults(filePath: string): Promise<TestResult[]> {
        return new Promise( (resolve, reject) => {
            let results: TestResult[];
            fs.readFile(filePath, (err, data) => {
                if (!err) {
                    const xdoc = new DOMParser().parseFromString(data.toString(), "application/xml");
                    results = parseUnitTestResults(xdoc.documentElement);

                    updateUnitTestDefinitions(xdoc.documentElement, results);

                    try {
                        fs.unlinkSync(filePath);
                    } catch {}

                    resolve(results);
                }
            });
        });
    }
}
