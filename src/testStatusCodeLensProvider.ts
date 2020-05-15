"use strict";
import { CancellationToken, CodeLens, CodeLensProvider, commands, Disposable, Event, EventEmitter, Range, SymbolInformation, SymbolKind, TextDocument } from "vscode";
import { ITestSymbol, Symbols } from "./symbols";
import { TestCommands } from "./testCommands";
import { ITestResult, TestResult } from "./testResult";
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

    public constructor(testCommands: TestCommands) {
        this.disposables.push(
            testCommands.onNewTestResults(this.addTestResults, this));
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

        return Symbols.getSymbols(document.uri, true)
        .then((symbols: ITestSymbol[]) => {
            const mapped: CodeLens[] = [];
            for (const symbol of symbols.filter((x) => x.documentSymbol.kind === SymbolKind.Method)) {
                for (const result of results.values()) {
                    if (result.matches(symbol.parentName, symbol.documentSymbol.name)) {
                        const state = TestStatusCodeLens.parseOutcome(result.outcome);
                        if (state) {
                            mapped.push(new TestStatusCodeLens(symbol.documentSymbol.selectionRange, state));
                            break;
                        }
                    } else if (result.matchesTheory(symbol.parentName, symbol.documentSymbol.name)) {
                        const state = TestStatusCodeLens.parseOutcome(result.outcome);
                        if (state === Utility.codeLensFailed) {
                            mapped.push(new TestStatusCodeLens(symbol.documentSymbol.selectionRange, Utility.codeLensFailed));
                            break;
                        } else {
                            // Checks if any input values for this theory fails
                            for (const theoryResult of results.values()) {
                                if (theoryResult.matchesTheory(symbol.parentName, symbol.documentSymbol.name)) {
                                    if (theoryResult.outcome === Utility.codeLensFailed) {
                                        mapped.push(new TestStatusCodeLens(symbol.documentSymbol.selectionRange, Utility.codeLensFailed));
                                        break;
                                    }
                                }
                            }
                        }
                        mapped.push(new TestStatusCodeLens(symbol.documentSymbol.selectionRange, state));
                    }
                }
            }

            return mapped;
        });
    }

    public resolveCodeLens(codeLens: CodeLens, token: CancellationToken): CodeLens {
        return codeLens;
    }

    private addTestResults(results: ITestResult) {
        for (const result of results.testResults) {
            this.testResults.set(result.fullName, result);
        }

        this.onDidChangeCodeLensesEmitter.fire(null);
    }
}
