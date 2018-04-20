"use strict";
import { CancellationToken, CodeLens, CodeLensProvider, commands, Disposable, Event, EventEmitter, Range, SymbolInformation, SymbolKind, TextDocument } from "vscode";
import { TestResult } from "./testResult";
import { TestResultsFile } from "./testResultsFile";
import { TestStatusCodeLens } from "./testStatusCodeLens";
import { Utility } from "./utility";

export class TestStatusCodeLensProvider implements CodeLensProvider {
    private disposables: Disposable[] = [];
    private onDidChangeCodeLensesEmitter = new EventEmitter<void>();

    // Store everything in a map so we can remember old tests results for the
    // scenario where a single test is ran. If the test no longer exists in
    // code it will never be mapped to the symbol, so no harm (though there is
    // a memory impact)
    private testResults = new Map<string, TestResult>();

    public constructor(testResultFile: TestResultsFile) {
        this.disposables.push(
            testResultFile.onNewResults(this.addTestResults, this));
    }

    public dispose() {
        while (this.disposables.length) {
            this.disposables.pop().dispose();
        }
    }

    public get onDidChangeCodeLenses(): Event<void> {
        return this.onDidChangeCodeLensesEmitter.event;
    }

    public provideCodeLenses(document: TextDocument, token: CancellationToken): CodeLens[] | Thenable<CodeLens[]> {
        if (!Utility.codeLensEnabled) {
            return [];
        }

        const results = this.testResults;
        return commands.executeCommand<SymbolInformation[]>("vscode.executeDocumentSymbolProvider", document.uri)
            .then((symbols) => {
                const mapped: CodeLens[] = [];
                for (const symbol of symbols.filter((x) => x.kind === SymbolKind.Method)) {
                    for (const result of results.values()) {
                        if (result.matches(symbol.containerName, symbol.name)) {
                            const state = TestStatusCodeLens.parseOutcome(result.outcome);
                            if (state) {
                                mapped.push(new TestStatusCodeLens(symbol.location.range, state));
                                break;
                            }
                        } else if (result.matchesTheory(symbol.containerName, symbol.name)) {
                            const state = TestStatusCodeLens.parseOutcome(result.outcome);
                            if (state === Utility.codeLensFailed) {
                                mapped.push(new TestStatusCodeLens(symbol.location.range, Utility.codeLensFailed));
                                break;
                            } else {
                                // Checks if any input values for this theory fails
                                for (const theoryResult of results.values()) {
                                    if (theoryResult.matchesTheory(symbol.containerName, symbol.name)) {
                                        if (theoryResult.outcome === Utility.codeLensFailed) {
                                            mapped.push(new TestStatusCodeLens(symbol.location.range, Utility.codeLensFailed));
                                            break;
                                        }
                                    }
                                }
                            }
                            mapped.push(new TestStatusCodeLens(symbol.location.range, state));
                        }
                    }
                }

                return mapped;
            });
    }

    public resolveCodeLens(codeLens: CodeLens, token: CancellationToken): CodeLens {
        return codeLens;
    }

    private addTestResults(results: TestResult[]) {
        for (const result of results) {
            this.testResults.set(result.fullName, result);
        }

        this.onDidChangeCodeLensesEmitter.fire();
    }
}
