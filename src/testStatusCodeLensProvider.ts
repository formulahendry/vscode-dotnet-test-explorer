"use strict";
import { CancellationToken, CodeLens, CodeLensProvider, commands, Disposable, Event, EventEmitter, Range, SymbolInformation, SymbolKind, TextDocument } from "vscode";
import { ITestSymbol, Symbols } from "./symbols";
import { TestCommands } from "./testCommands";
import { ITestResult } from "./testResult";
import { TestStatusCodeLens } from "./testStatusCodeLens";
import { Utility } from "./utility";

export class TestStatusCodeLensProvider implements CodeLensProvider {
    private disposables: Disposable[] = [];
    private onDidChangeCodeLensesEmitter = new EventEmitter<void>();

    // Store everything in a map so we can remember old tests results for the
    // scenario where a single test is ran. If the test no longer exists in
    // code it will never be mapped to the symbol, so no harm (though there is
    // a memory impact)
    private testResults = new Map<string, ITestResult>();

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

    public async provideCodeLenses(document: TextDocument, token: CancellationToken): Promise<CodeLens[]> {
        if (!Utility.codeLensEnabled) {
            return [];
        }

        const results = this.testResults;

        const symbols = await Symbols.getSymbols(document.uri, true);

        const mapped: CodeLens[] = [];
        for (const symbol of symbols.filter((x) => x.documentSymbol.kind === SymbolKind.Function || x.documentSymbol.kind === SymbolKind.Method)) {
            for (const result of results.values()) {
                if (result.fullName.startsWith(symbol.fullName)) {
                    const state = TestStatusCodeLens.parseOutcome(result.outcome);
                    if (state) {
                        mapped.push(new TestStatusCodeLens(symbol.documentSymbol.selectionRange, state));
                        break;
                    }
                }
            }
        }

        return mapped;
    }

    public resolveCodeLens(codeLens: CodeLens, token: CancellationToken): CodeLens {
        return codeLens;
    }

    private addTestResults(results: ITestResult[]) {
        for (const result of results) {
            this.testResults.set(result.fullName, result);
        }

        this.onDidChangeCodeLensesEmitter.fire(null);
    }
}
