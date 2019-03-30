import * as assert from "assert";
import * as vscode from "vscode";
import { Symbols } from "../src/symbols";

suite("Flattend symbols", () => {

    test("Has correct fully qualified names when classes contains fqn and classes are nested", () => {

        const myNamespace = GetDocumentSymbol("MyNameSpace", vscode.SymbolKind.Namespace);

        const myClass = GetDocumentSymbol("MyNameSpace.MyClass", vscode.SymbolKind.Class);

        const myNestedClass = GetDocumentSymbol("MyNameSpace.MyClass.MyNestedClass", vscode.SymbolKind.Class);

        const myMethodOne = GetDocumentSymbol("MyMethodOne", vscode.SymbolKind.Method);

        const myMethodTwo = GetDocumentSymbol("MyMethodTwo", vscode.SymbolKind.Method);

        myNestedClass.children = [myMethodOne, myMethodTwo];

        myClass.children = [myMethodOne, myMethodTwo, myNestedClass];

        myNamespace.children = [myClass];

        const flattened = Symbols.flatten([myNamespace]);

        assert.equal(flattened.length, 7);

        assert.equal(flattened[0].fullName, "MyNameSpace");
        assert.equal(flattened[0].parentName, null);

        assert.equal(flattened[1].fullName, "MyNameSpace.MyClass");
        assert.equal(flattened[1].parentName, "MyNameSpace");

        assert.equal(flattened[2].fullName, "MyNameSpace.MyClass.MyMethodOne");
        assert.equal(flattened[2].parentName, "MyNameSpace.MyClass");

        assert.equal(flattened[3].fullName, "MyNameSpace.MyClass.MyMethodTwo");
        assert.equal(flattened[3].parentName, "MyNameSpace.MyClass");

        assert.equal(flattened[4].fullName, "MyNameSpace.MyClass.MyNestedClass");
        assert.equal(flattened[4].parentName, "MyNameSpace.MyClass");

        assert.equal(flattened[5].fullName, "MyNameSpace.MyClass.MyNestedClass.MyMethodOne");
        assert.equal(flattened[5].parentName, "MyNameSpace.MyClass.MyNestedClass");

        assert.equal(flattened[6].fullName, "MyNameSpace.MyClass.MyNestedClass.MyMethodTwo");
        assert.equal(flattened[6].parentName, "MyNameSpace.MyClass.MyNestedClass");
    });

    test("Can remove arguments to test methods", () => {

        const myMethod = GetDocumentSymbol("MyMethodOne", vscode.SymbolKind.Method);

        let flattened = Symbols.flatten([myMethod]);

        assert.equal(flattened[0].fullName, "MyMethodOne");

        const myMethodWithArguments = GetDocumentSymbol("MyMethodOne(TestCase: Something)", vscode.SymbolKind.Method);

        flattened = Symbols.flatten([myMethodWithArguments], true);

        assert.equal(flattened[0].fullName, "MyMethodOne");

    });
});

function GetDocumentSymbol(name: string, kind: vscode.SymbolKind): vscode.DocumentSymbol {
    return new vscode.DocumentSymbol(name, null, kind, new vscode.Range(new vscode.Position(1, 1), new vscode.Position(1, 1)), new vscode.Range(new vscode.Position(1, 1), new vscode.Position(1, 1)));
}
