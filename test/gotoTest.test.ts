import * as assert from "assert";
import * as vscode from "vscode";
import { GotoTest } from "../src/gotoTest";
const TestNode : any = undefined; // TODO: migrate tests

suite("Find test location", () => {

    test("No symbols", () => {
        const symbols = [];

        const testNode = new TestNode("", "Test", null);

        const gotoTest = new GotoTest();

        assert.throws(() => gotoTest.findTestLocation(symbols, testNode), "No symbols found)");
    });

    test("No symbol matching", () => {
        const symbols = [
            GetSymbol("Test",  vscode.SymbolKind.Method, "c:\\temp\\test.txt"),
        ];

        const testNode = new TestNode("", "NotFound", null);

        const gotoTest = new GotoTest();

        assert.throws(() => gotoTest.findTestLocation(symbols, testNode), "No symbols matching");
    });

    test("One symbol matching", () => {
        const symbols = [
            GetSymbol("Test",  vscode.SymbolKind.Method, "c:\\temp\\test.txt"),
        ];

        const testNode = new TestNode("", "Test", null);

        const gotoTest = new GotoTest();
        const result = gotoTest.findTestLocation(symbols, testNode);

        assert.equal(result.location.uri.fsPath, vscode.Uri.parse("c:\\temp\\test.txt").fsPath);
    });

    test("One F# symbol matching", () => {
        const symbols = [
            GetSymbol("Test", vscode.SymbolKind.Variable, "c:\\temp\\test.fs"),
        ];

        const testNode = new TestNode("", "Test", null);

        const gotoTest = new GotoTest();
        const result = gotoTest.findTestLocation(symbols, testNode);

        assert.equal(result.location.uri.fsPath, vscode.Uri.parse("c:\\temp\\test.fs").fsPath);
    });

    test("One F# symbol with spaces matching", () => {
        const symbols = [
            GetSymbol("Test with spaces", vscode.SymbolKind.Variable, "c:\\temp\\test.fs"),
        ];

        const testNode = new TestNode("", "Test with spaces", null);

        const gotoTest = new GotoTest();
        const result = gotoTest.findTestLocation(symbols, testNode);

        assert.equal(result.location.uri.fsPath, vscode.Uri.parse("c:\\temp\\test.fs").fsPath);
    });

    test("Multiple symbols matching with no namespace matching uri", () => {
        const symbols = [
            GetSymbol("Test",  vscode.SymbolKind.Method, "file:\\c:/temp/folderx/test.txt"),
            GetSymbol("Test",  vscode.SymbolKind.Method, "file:\\c:/temp/foldery/test.txt"),
        ];

        const testNode = new TestNode("MyFolder.Test", "Test", null);

        const gotoTest = new GotoTest();
        assert.throws(() => gotoTest.findTestLocation(symbols, testNode), "Namespace not matching uri");
    });

    test("Match with multiple symbols for tests without namespace", () => {
        const symbols = [
            GetSymbol("Test", vscode.SymbolKind.Method, "file:\\c:/temp/test3.txt"),
            GetSymbol("Test", vscode.SymbolKind.Method, "file:\\c:/temp/myfolder/test.txt"),
            GetSymbol("Test",  vscode.SymbolKind.Method, "file:\\c:/temp/folderx/test.txt"),
        ];

        const testNode = new TestNode("", "Test", null);

        const gotoTest = new GotoTest();
        assert.throws(() => gotoTest.findTestLocation(symbols, testNode), "Found multiple matching symbols");
    });

    test("Classes are not matches", () => {
        const symbols = [
            GetSymbol("Test", vscode.SymbolKind.Class, "c:\\temp\\test2.txt"),
            GetSymbol("Test",  vscode.SymbolKind.Method, "c:\\temp\\test.txt"),
        ];

        const testNode = new TestNode("", "Test", null);

        const gotoTest = new GotoTest();
        const result = gotoTest.findTestLocation(symbols, testNode);

        assert.equal(result.location.uri.fsPath, vscode.Uri.parse("c:\\temp\\test.txt").fsPath);
    });

    test("Match with multiple symbols matching start of name", () => {
        const symbols = [
            GetSymbol("Test3", vscode.SymbolKind.Method, "c:\\temp\\test3.txt"),
            GetSymbol("Test2", vscode.SymbolKind.Method, "c:\\temp\\test2.txt"),
            GetSymbol("Test",  vscode.SymbolKind.Method, "c:\\temp\\test.txt"),
        ];

        const testNode = new TestNode("", "Test", null);

        const gotoTest = new GotoTest();
        const result = gotoTest.findTestLocation(symbols, testNode);

        assert.equal(result.location.uri.fsPath, vscode.Uri.parse("c:\\temp\\test.txt").fsPath);
    });

    test("Match with multiple symbols matching start of name for xunit theory", () => {
        const symbols = [
            GetSymbol("Test3", vscode.SymbolKind.Method, "c:\\temp\\test3.txt"),
            GetSymbol("Test2", vscode.SymbolKind.Method, "c:\\temp\\test2.txt"),
            GetSymbol("Test(param: value)",  vscode.SymbolKind.Method, "c:\\temp\\test.txt"),
        ];

        const testNode = new TestNode("", "Test", null);

        const gotoTest = new GotoTest();
        const result = gotoTest.findTestLocation(symbols, testNode);

        assert.equal(result.location.uri.fsPath, vscode.Uri.parse("c:\\temp\\test.txt").fsPath);
    });
});

suite("Get test method name", () => {

    test("Test name without namespace", () => {

        const gotoTest = new GotoTest();
        const result = gotoTest.getTestMethodName("Test");

        assert.equal(result, "Test");
    });

    test("XUnit theory name without namespace", () => {

        const gotoTest = new GotoTest();
        const result = gotoTest.getTestMethodName("Test(param: value)");

        assert.equal(result, "Test");
    });
});

function GetSymbol(name: string, kind: vscode.SymbolKind, filePath: string): vscode.SymbolInformation {
    return new vscode.SymbolInformation(name,  kind, "", new vscode.Location(vscode.Uri.parse(filePath), new vscode.Range(new vscode.Position(10, 10), new vscode.Position(20, 20))));
}
