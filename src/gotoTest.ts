import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { Logger } from "./logger";
import { Utility } from "./utility";
import { TestNode } from "./treeNodes/testNode";
import { parseTestName, IStringView, getSegmentStart } from "./parseTestName";

export class GotoTest {

    public async go(test: TestNode) {

        AppInsightsClient.sendEvent("gotoTest");

        // Remove all brackets from the test name
        const parsed = parseTestName(test.fullName);
        const bracketsRemoved = parsed.segments
            .map(segment => parsed.fullName.substring(getSegmentStart(segment), segment.name.end))
            .join("");

        const symbols = await vscode.commands.executeCommand<vscode.SymbolInformation[]>(
            "vscode.executeWorkspaceSymbolProvider",
            bracketsRemoved,
        )

        let symbol: vscode.SymbolInformation;

        try {
            symbol = this.findTestLocation(symbols, bracketsRemoved);
            const doc = await vscode.workspace.openTextDocument(symbol.location.uri);
            const editor = await vscode.window.showTextDocument(doc)
            const loc = symbol.location.range;
            const selection = new vscode.Selection(loc.start.line, loc.start.character, loc.start.line, loc.end.character);
            editor.selection = selection;
            editor.revealRange(selection, vscode.TextEditorRevealType.InCenter);
        } catch (r) {
            Logger.Log(r.message);
            vscode.window.showWarningMessage(r.message);
        }
    }

    public findTestLocation(symbols: vscode.SymbolInformation[], testName: string): vscode.SymbolInformation {

        if (symbols.length === 0) {
            throw new Error("Could not find test (no symbols found)");
        }

        symbols = symbols.filter((s) => this.isSymbolATestCandidate(s) && testName.endsWith(this.getTestMethodName(s.name)));

        if (symbols.length === 0) {
            throw Error("Could not find test (no symbols matching)");
        }

        if (symbols.length > 1) {
            throw Error("Could not find test (found multiple matching symbols)");
        }

        return symbols[0];
    }

    public getTestMethodName(testName: string): string {
        // The symbols are reported on the form Method or Method(string, int) (in case of test cases etc).
        // We are only interested in the method name, not its arguments
        return testName.replace(/\(.*$/, "");
    }

    private isSymbolATestCandidate(s: vscode.SymbolInformation): boolean {
        return s.location.uri.toString().endsWith(".fs") ? s.kind === vscode.SymbolKind.Variable : s.kind === vscode.SymbolKind.Method;
    }
}
