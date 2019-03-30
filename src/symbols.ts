import * as vscode from "vscode";

export interface ITestSymbol {
    parentName: string;
    fullName: string;
    documentSymbol: vscode.DocumentSymbol;
}

export class Symbols {
    public static async getSymbols(uri, removeArgumentsFromMethods?: boolean): Promise<ITestSymbol[]> {
        return vscode.commands.executeCommand<vscode.DocumentSymbol[]>("vscode.executeDocumentSymbolProvider", uri)

            .then((symbols) => {

                if (!symbols) {
                    return [];
                }

                const flattenedSymbols = Symbols.flatten(symbols, removeArgumentsFromMethods);

                if (removeArgumentsFromMethods) {
                    flattenedSymbols.map( (s) => s.documentSymbol).forEach( (s) => s.name = s.name.replace(/\(.*\)/g, ""));
                }

                return flattenedSymbols;
            });
    }

    public static flatten(documentSymbols: vscode.DocumentSymbol[], removeArgumentsFromMethods?: boolean, parent?: string): ITestSymbol[] {

        let flattened: ITestSymbol[] = [];

        documentSymbols.map( (ds: vscode.DocumentSymbol) => {

            let nameForCurrentLevel: string;

            let nameForSymbol = ds.name;

            if (ds.kind === vscode.SymbolKind.Method && removeArgumentsFromMethods) {
                nameForSymbol = nameForSymbol.replace(/\(.*\)/g, "");
            }

            if (ds.kind === vscode.SymbolKind.Class) {
                nameForCurrentLevel = nameForSymbol;
            } else {
                nameForCurrentLevel = parent ? `${parent}.${nameForSymbol}` : nameForSymbol;
            }

            flattened.push({fullName: nameForCurrentLevel, parentName: parent, documentSymbol: ds});

            if (ds.children) {
                flattened = flattened.concat(Symbols.flatten(ds.children, removeArgumentsFromMethods, nameForCurrentLevel));
            }
        });

        return flattened;
    }
}
