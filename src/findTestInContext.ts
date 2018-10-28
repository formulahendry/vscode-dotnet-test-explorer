import * as vscode from "vscode";
import { SymbolKind } from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { Symbols } from "./symbols";
import { ITestRunContext } from "./testCommands";

export class FindTestInContext {

    public async find(doc: vscode.TextDocument, position: vscode.Position): Promise<ITestRunContext> {

        AppInsightsClient.sendEvent("findTestInContext");

        return Symbols.getSymbols(doc.uri, true).then( (documentSymbols: vscode.DocumentSymbol[]) => {

            const symbolsInRange = documentSymbols.filter( (ds) => ds.range.contains(position));

            // When need to type as any since containerName is not exposed in the DocumentSymbol typescript object
            let symbolCandidate: any;

            symbolCandidate = symbolsInRange.find( (s) => s.kind === vscode.SymbolKind.Method);

            if (symbolCandidate) {
                return {testName: (symbolCandidate.containerName + "." + symbolCandidate.name), isSingleTest: true};
            }

            symbolCandidate = symbolsInRange.find( (s) => s.kind === vscode.SymbolKind.Class);

            if (symbolCandidate) {
                return {testName: symbolCandidate.name, isSingleTest: false};
            }
        });
    }
}
