import * as assert from "assert";
import * as vscode from "vscode";
import { Symbols } from "../src/symbols";

suite("Flattend symbols", () => {

    test("Has correct fully qualified names", () => {

        const myNamespace = GetDocumentSymbol("MyNameSpace", vscode.SymbolKind.Namespace);

        const myClass = GetDocumentSymbol("MyClass", vscode.SymbolKind.Class);

        const myMethodOne = GetDocumentSymbol("MyMethodOne", vscode.SymbolKind.Method);

        const myMethodTwo = GetDocumentSymbol("MyMethodTwo", vscode.SymbolKind.Method);

        myClass.children = [myMethodOne, myMethodTwo];

        myNamespace.children = [myClass];

        const flattened = Symbols.flatten([myNamespace]);

        assert.equal(flattened.length, 4);

        assert.equal(flattened[0].fullName, "MyNameSpace");
        assert.equal(flattened[0].parentName, null);

        assert.equal(flattened[1].fullName, "MyNameSpace.MyClass");
        assert.equal(flattened[1].parentName, "MyNameSpace");

        assert.equal(flattened[2].fullName, "MyNameSpace.MyClass.MyMethodOne");
        assert.equal(flattened[2].parentName, "MyNameSpace.MyClass");

        assert.equal(flattened[3].fullName, "MyNameSpace.MyClass.MyMethodTwo");
        assert.equal(flattened[3].parentName, "MyNameSpace.MyClass");
    });
});

function GetDocumentSymbol(name: string, kind: vscode.SymbolKind): vscode.DocumentSymbol {
    return new vscode.DocumentSymbol(name, null, kind, new vscode.Range(new vscode.Position(1, 1), new vscode.Position(1, 1)), new vscode.Range(new vscode.Position(1, 1), new vscode.Position(1, 1)));
}
