"use strict";
import * as vscode from "vscode";
import { TestNode } from "./testNode";

export function GoToTest(test: TestNode): void {

    // Testname can be either Method or Full.Name.Space.Class.Method (xunit when running without tree) but we must only search for Method
    let name = test.name;

    const lastDot = name.lastIndexOf(".");

    if (lastDot > -1) {
        name = name.substring(lastDot + 1);
    }

    const symbolInformation = vscode.commands.executeCommand<vscode.SymbolInformation[]>(
        "vscode.executeWorkspaceSymbolProvider",
        name,
    ).then((symbols) => {
        const symbolCandidates = [];
        for (const symbol of symbols.filter((x) => x.kind === vscode.SymbolKind.Method && x.name.replace("()", "") === name )) {
            symbolCandidates.push(symbol);
        }

        return symbolCandidates;
    }).then((symbolCandidates) => {
        // If multiple results are found, try to match the uri of the match to the parent path of the test
        if (symbolCandidates.length > 0) {
            return symbolCandidates.filter((x) => x.location.uri.toString().replace(/\//g, ".").indexOf(test.parentPath) > -1);
        }

        return symbolCandidates;
    }).then((symbol) => {
        vscode.workspace.openTextDocument(symbol[0].location.uri).then((doc) => {
            vscode.window.showTextDocument(doc).then((editor) => {
                const loc = symbol[0].location.range;
                vscode.window.activeTextEditor.selection = new vscode.Selection(loc.start.line, loc.start.character, loc.start.line, loc.end.character);
            });
        });
    });
}
