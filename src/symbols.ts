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
                const flattenedSymbols = Symbols.flatten(symbols);

                if (removeArgumentsFromMethods) {
                    flattenedSymbols.map( (s) => s.documentSymbol).forEach( (s) => s.name = s.name.replace(/\(.*\)/g, ""));
                }

                return flattenedSymbols;
            });
    }

    public static flatten(documentSymbols: vscode.DocumentSymbol[], parent?: string): ITestSymbol[] {

        let flattened: ITestSymbol[] = [];

        documentSymbols.map( (ds: vscode.DocumentSymbol) => {

            const nameForCurrentLevel = parent ? `${parent}.${ds.name}` : ds.name;

            flattened.push({fullName: nameForCurrentLevel, parentName: parent, documentSymbol: ds});

            if (ds.children) {
                flattened = flattened.concat(Symbols.flatten(ds.children, nameForCurrentLevel));
            }
        });

        return flattened;
    }
}
