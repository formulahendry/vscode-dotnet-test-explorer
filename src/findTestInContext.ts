import * as vscode from "vscode";
import { SymbolKind } from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { ITestRunContext } from "./testCommands";

export class FindTestInContext {

    public async find(doc: vscode.TextDocument, lineNumber: number): Promise<ITestRunContext> {

        AppInsightsClient.sendEvent("findTestInContext");

        return vscode.commands.executeCommand<vscode.SymbolInformation[]>(
                "vscode.executeDocumentSymbolProvider",
                doc.uri,
            ).then((symbols) => {
                const documentContent = doc.getText();
                const namespace = this.getNamespace(documentContent);
                return this.getTestString(symbols, lineNumber, namespace);
            });
    }

    public getNamespace(sourceText: string) {
        const regexp = /namespace (\S*)/igm;
        const result = regexp.exec(sourceText);

        return result ? result[1] : "";
    }

    public getTestString(symbols: vscode.SymbolInformation[], lineNumber: number, namespace: string): ITestRunContext {
        let symbolToRunTestsFor: vscode.SymbolInformation;

        symbols = symbols.filter( (s) => s.kind === vscode.SymbolKind.Method || s.kind === vscode.SymbolKind.Class);

        if (symbols.length === 1) {
            symbolToRunTestsFor = symbols[0];
        } else {
            const allSymbolsAboveLine = symbols
                .map((s) => ({ symbol: s, lineDiff: lineNumber - s.location.range.start.line }) )
                .filter((x) => x.lineDiff >= 0);

            symbolToRunTestsFor = allSymbolsAboveLine.length > 0
                ? allSymbolsAboveLine.reduce((prev, curr) => prev.lineDiff < curr.lineDiff ? prev : curr).symbol
                : symbols[0];
        }

        namespace = namespace.length > 0 ? namespace + "." : "";

        const testName = namespace + (symbolToRunTestsFor.containerName
            ? symbolToRunTestsFor.containerName + "." + symbolToRunTestsFor.name
            : symbolToRunTestsFor.name);

        return {testName, isSingleTest: symbolToRunTestsFor.kind === SymbolKind.Method};
    }
}
