"use strict";
import { CancellationToken, CodeLens, CodeLensProvider, commands, Disposable, Event, EventEmitter, Range, SymbolInformation, SymbolKind, TextDocument, workspace } from "vscode";
import { TestResult } from "./testResult";
import { TestResultsFile } from "./testResultsFile";
import { TestStatusCodeLens } from "./testStatusCodeLens";

export class TestStatusCodeLensProvider implements CodeLensProvider {
    private disposables: Disposable[] = [];
    private enabled: boolean;
    private onDidChangeCodeLensesEmitter = new EventEmitter<void>();

    // Store everything in a map so we can remember old tests results for the
    // scenario where a single test is ran. If the test no longer exists in
    // code it will never be mapped to the symbol, so no harm (though there is
    // a memory impact)
    private testResults = new Map<string, TestResult>();

    public constructor(testResultFile: TestResultsFile) {
        this.checkEnabledOption();

        this.disposables.push(
            testResultFile.onNewResults(this.addTestResults, this));

        this.disposables.push(
            workspace.onDidChangeConfiguration(this.checkEnabledOption, this));
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
        if (!this.enabled) {
            return [];
        }

        const results = this.testResults;
        return commands.executeCommand<SymbolInformation[]>("vscode.executeDocumentSymbolProvider", document.uri)
            .then((symbols) => {
                const mapped: CodeLens[] = [];
                for (const symbol of symbols.filter((x) => x.kind === SymbolKind.Method)) {
                    const fullName = symbol.containerName + "." + symbol.name;
                    for (const result of results.values()) {
                        if (result.testName.endsWith(fullName)) {
                            const state = TestStatusCodeLens.parseOutcome(result.outcome);
                            if (state) {
                                mapped.push(new TestStatusCodeLens(symbol.location.range, state));
                            }
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
            this.testResults.set(result.testName, result);
        }

        this.onDidChangeCodeLensesEmitter.fire();
    }

    private checkEnabledOption(): void {
        this.enabled = workspace.getConfiguration("csharp").get<boolean>("testsCodeLens.enabled", true);
    }
}
