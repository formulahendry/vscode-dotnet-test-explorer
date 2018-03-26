import * as assert from "assert";
import * as path from "path";
import * as vscode from "vscode";
import { TestNode } from "../src/testNode";
import { TestResult } from "../src/testResult";
import { FindTestInContext } from "../src/findTestInContext";

suite("Find test in context tests", () => {

    test("One symbol", async () => {

        const findTestInContext = new FindTestInContext();

        const symbols = [
            new vscode.SymbolInformation("MyClass", vscode.SymbolKind.Class, "", new vscode.Location(vscode.Uri.file("c:/"), new vscode.Range(new vscode.Position(5, 1), new vscode.Position(200, 1))))
        ];

        const result = await findTestInContext.getTestString(symbols, 10, "");

        assert.equal(result, "MyClass");
    });

    test("Multiple symbols, match closest in context", async () => {

        const findTestInContext = new FindTestInContext();

        const symbols = [
            new vscode.SymbolInformation("MyClass", vscode.SymbolKind.Class, "", new vscode.Location(vscode.Uri.file("c:/"), new vscode.Range(new vscode.Position(5, 1), new vscode.Position(5, 7)))),
            new vscode.SymbolInformation("TestMethod", vscode.SymbolKind.Method, "MyClass", new vscode.Location(vscode.Uri.file("c:/"), new vscode.Range(new vscode.Position(8, 1), new vscode.Position(8, 11)))),
            new vscode.SymbolInformation("TestMethod2", vscode.SymbolKind.Method, "MyClass", new vscode.Location(vscode.Uri.file("c:/"), new vscode.Range(new vscode.Position(15, 1), new vscode.Position(15, 11))))
        ];

        assert.equal(findTestInContext.getTestString(symbols, 8, ""), "MyClass.TestMethod");
        assert.equal(findTestInContext.getTestString(symbols, 14, ""), "MyClass.TestMethod");
        assert.equal(findTestInContext.getTestString(symbols, 14, "Namespace"), "Namespace.MyClass.TestMethod");

        assert.equal(findTestInContext.getTestString(symbols, 15, ""), "MyClass.TestMethod2");
        assert.equal(findTestInContext.getTestString(symbols, 1000, ""), "MyClass.TestMethod2");
        assert.equal(findTestInContext.getTestString(symbols, 1000, "Name.Space"), "Name.Space.MyClass.TestMethod2");

        assert.equal(findTestInContext.getTestString(symbols, 5, ""), "MyClass");
        assert.equal(findTestInContext.getTestString(symbols, 6, ""), "MyClass");
        assert.equal(findTestInContext.getTestString(symbols, 1, ""), "MyClass");
        assert.equal(findTestInContext.getTestString(symbols, 1, "Name.Space"), "Name.Space.MyClass");
    });
});

suite("Find namespace tests", () => {

    test("Find namespace", async () => {
        const fixturePath = path.join(__dirname, "..", "..", "test", "xunittests", "TestClass1.cs");
        const findTestInContext = new FindTestInContext();

        await vscode.workspace.openTextDocument(vscode.Uri.file(fixturePath)).then((textDocument) => {
            const fileContent = textDocument.getText();
            const result = findTestInContext.getNamespace(fileContent);

            assert.equal(result, "XunitTests");
        });
    });

    test("Find namespace with curly brancket on same line", async () => {
        const fixturePath = path.join(__dirname, "..", "..", "test", "mstest", "TestClass1.cs");
        const findTestInContext = new FindTestInContext();

        await vscode.workspace.openTextDocument(vscode.Uri.file(fixturePath)).then((textDocument) => {
            const fileContent = textDocument.getText();
            const result = findTestInContext.getNamespace(fileContent);

            assert.equal(result, "MsTestTests");
        });
    });
});        