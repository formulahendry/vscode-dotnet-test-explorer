import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { Logger } from "./logger";
import { TestNode } from "./testNode";
import { Utility } from "./utility";

export class GotoTest {

    public go(test: TestNode): void {

        AppInsightsClient.sendEvent("gotoTest");

        const symbolInformation = vscode.commands.executeCommand<vscode.SymbolInformation[]>(
            "vscode.executeWorkspaceSymbolProvider",
            test.fqn,
        ).then((symbols) => {

            let symbol: vscode.SymbolInformation;

            try {
                symbol = this.findTestLocation(symbols, test);

                vscode.workspace.openTextDocument(symbol.location.uri).then((doc) => {
                    vscode.window.showTextDocument(doc).then((editor) => {
                        const loc = symbol.location.range;
                        const selection = new vscode.Selection(loc.start.line, loc.start.character, loc.start.line, loc.end.character);
                        vscode.window.activeTextEditor.selection = selection;
                        vscode.window.activeTextEditor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
                    });
                });

            } catch (r) {
                Logger.Log(r.message);
                vscode.window.showWarningMessage(r.message);
            }

        });
    }

    public findTestLocation(symbols: vscode.SymbolInformation[], testNode: TestNode): vscode.SymbolInformation {

        if (symbols.length === 0) {
            throw new Error("Could not find test (no symbols found)");
        }

        const testFqn = testNode.fqn;

        symbols = symbols.filter((s) => this.isSymbolATestCandidate(s) && testFqn.endsWith(this.getTestMethodFqn(s.name)));

        if (symbols.length === 0) {
            throw Error("Could not find test (no symbols matching)");
        }

        if (symbols.length > 1) {
            throw Error("Could not find test (found multiple matching symbols)");
        }

        return symbols[0];
    }

    public getTestMethodFqn(testName: string): string {
        // The symbols are reported on the form Method or Method(string, int) (in case of test cases etc).
        // We are only interested in the method name, not its arguments
        const firstParanthesis = testName.indexOf("(");

        if (firstParanthesis > -1) {
            testName = testName.substring(0, firstParanthesis);
        }

        return testName;
    }
    private fsharpSymbolKinds = [vscode.SymbolKind.Variable, vscode.SymbolKind.Field, vscode.SymbolKind.Method];
    private isSymbolATestCandidate(s: vscode.SymbolInformation): boolean {
        return s.location.uri.toString().endsWith(".fs") ? this.fsharpSymbolKinds.includes(s.kind) : s.kind === vscode.SymbolKind.Method;
    }
}
