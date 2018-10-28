import * as vscode from "vscode";

export class Symbols {
    public static async getSymbols(uri, removeArgumentsFromMethods?: boolean): Promise<vscode.DocumentSymbol[]> {
        return vscode.commands.executeCommand<vscode.DocumentSymbol[]>("vscode.executeDocumentSymbolProvider", uri)
            .then((symbols) => {
                const flattenedSymbols = Symbols.flatten(symbols);

                if (removeArgumentsFromMethods) {
                    flattenedSymbols.forEach( (s) => s.name = s.name.replace(/\(.*\)/g, ""));
                }

                return flattenedSymbols;
            });
    }

    private static flatten(documentSymbols: vscode.DocumentSymbol[]): vscode.DocumentSymbol[] {

        let flattened = [];

        documentSymbols.map( (ds: vscode.DocumentSymbol) => {

            flattened.push(ds);

            if (ds.children) {
                flattened = flattened.concat(Symbols.flatten(ds.children));
            }
        });

        return flattened;
    }
}
