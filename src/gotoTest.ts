import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { Logger } from "./logger";
import { TestNode } from "./testNode";

export class GotoTest {

    public go(test: TestNode): void {

        AppInsightsClient.sendEvent("gotoTest");

        const testname = this.getTestName(test.name);

        const symbolInformation = vscode.commands.executeCommand<vscode.SymbolInformation[]>(
            "vscode.executeWorkspaceSymbolProvider",
            testname,
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

        const testName = this.getTestName(testNode.name);

        symbols = symbols.filter( (s) => s.kind === vscode.SymbolKind.Method && s.name.replace("()", "") === testName);

        if (symbols.length === 0) {
            throw Error("Could not find test (no symbols matching)");
        }

        // If multiple results are found, try to match the uri of the match to the parent path of the test
        if (symbols.length > 1) {
            const testNamespace = this.getTestNamespace(testNode);
            symbols = symbols.filter((x) => x.location.uri.toString().replace(/\//g, ".").toLowerCase().indexOf(testNamespace.toLowerCase() + ".") > -1);

            if (symbols.length === 0) {
                throw Error("Could not find test (namespace not matching uri)");
            }

            if (symbols.length > 1) {
                throw Error("Could not find test (found multiple matching symbols)");
            }
        }

        return symbols[0];
    }

    public getTestName(testName: string): string {
        const lastDotIndex = testName.lastIndexOf(".");

        if (lastDotIndex > -1) {
            testName = testName.substring(lastDotIndex + 1);
        }

        return testName;
    }

    public getTestNamespace(testNode: TestNode): string {

        if (testNode.parentPath.length === 0) {
            const testName = this.getTestName(testNode.name);
            return testNode.name.substring(0, testNode.name.indexOf(testName) - 1);
        }

        return testNode.parentPath;
    }
}
