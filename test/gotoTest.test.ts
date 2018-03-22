import * as assert from "assert";
import * as path from 'path';
import * as vscode from "vscode";
import { GotoTest } from "../src/gotoTest";
import { TestNode } from "../src/testNode";

suite("Find test location", () => {

    test("No symbols", () => {
        var symbols = [];

        var testNode = new TestNode("", "Test", null);

        var gotoTest = new GotoTest();

        assert.throws(() => gotoTest.findTestLocation(symbols, testNode), "Could not find test (no symbols found)");
    });

    test("No symbol matching", () => {
        var symbols = [
            GetSymbol("Test",  vscode.SymbolKind.Method, "c:\\temp\\test.txt"),
        ]

        var testNode = new TestNode("", "NotFound", null);

        var gotoTest = new GotoTest();

        assert.throws(() => gotoTest.findTestLocation(symbols, testNode), "Could not find test (no symbols matching)");
    });

    test("One symbol matching", () => {
        var symbols = [
            GetSymbol("Test",  vscode.SymbolKind.Method, "c:\\temp\\test.txt"),
        ]

        var testNode = new TestNode("", "Test", null);

        var gotoTest = new GotoTest();
        var result = gotoTest.findTestLocation(symbols, testNode);

        assert.equal(result.location.uri.fsPath, vscode.Uri.parse("c:\\temp\\test.txt").fsPath);
    });

    test("Multiple symbols matching with no namespace matching uri", () => {
        var symbols = [
            GetSymbol("Test",  vscode.SymbolKind.Method, "file:\\c:/temp/folderx/test.txt"),
            GetSymbol("Test",  vscode.SymbolKind.Method, "file:\\c:/temp/foldery/test.txt")
        ]

        var testNode = new TestNode("MyFolder.Test", "Test", null);

        var gotoTest = new GotoTest();
        assert.throws(() => gotoTest.findTestLocation(symbols, testNode), "Could not find test (namespace not matching uri)");
    });

    test("Classes are not matches", () => {
        var symbols = [
            GetSymbol("Test", vscode.SymbolKind.Class, "c:\\temp\\test2.txt"),
            GetSymbol("Test",  vscode.SymbolKind.Method, "c:\\temp\\test.txt"),
        ]

        var testNode = new TestNode("", "Test", null);

        var gotoTest = new GotoTest();
        var result = gotoTest.findTestLocation(symbols, testNode);

        assert.equal(result.location.uri.fsPath, vscode.Uri.parse("c:\\temp\\test.txt").fsPath);
    });    

    test("Match with multiple symbols matching start of name", () => {
        var symbols = [
            GetSymbol("Test3", vscode.SymbolKind.Method, "c:\\temp\\test3.txt"),
            GetSymbol("Test2", vscode.SymbolKind.Method, "c:\\temp\\test2.txt"),
            GetSymbol("Test",  vscode.SymbolKind.Method, "c:\\temp\\test.txt"),
        ]

        var testNode = new TestNode("", "Test", null);

        var gotoTest = new GotoTest();
        var result = gotoTest.findTestLocation(symbols, testNode);

        assert.equal(result.location.uri.fsPath, vscode.Uri.parse("c:\\temp\\test.txt").fsPath);
    });

    test("Match with multiple symbols matching namespace with uri", () => {
        var symbols = [
            GetSymbol("Test3", vscode.SymbolKind.Method, "file:\\c:/temp/test3.txt"),
            GetSymbol("Test", vscode.SymbolKind.Method, "file:\\c:/temp/myfolder/test2.txt"),
            GetSymbol("Test",  vscode.SymbolKind.Method, "file:\\c:/temp/myfolder/test.txt"),
        ]

        var testNode = new TestNode("MyFolder.Test", "Test", null);

        var gotoTest = new GotoTest();
        var result = gotoTest.findTestLocation(symbols, testNode);

        assert.equal(result.location.uri.fsPath, vscode.Uri.parse("file:\\c:/temp/myfolder/test.txt").fsPath);
    });

    test("Match with multiple symbols matching classname with uri", () => {
        var symbols = [
            GetSymbol("Test3", vscode.SymbolKind.Method, "file:\\c:/temp/test3.txt"),
            GetSymbol("Test", vscode.SymbolKind.Method, "file:\\c:/temp/myfolder/test.txt"),
            GetSymbol("Test",  vscode.SymbolKind.Method, "file:\\c:/temp/folderx/test.txt"),
        ]

        var testNode = new TestNode("FolderX.Test", "Test", null);

        var gotoTest = new GotoTest();
        var result = gotoTest.findTestLocation(symbols, testNode);

        assert.equal(result.location.uri.fsPath, vscode.Uri.parse("file:\\c:/temp/folderx/test.txt").fsPath);
    });
});

suite("Get test names", () => {

    test("Test name without namespace", () => {
    
        var gotoTest = new GotoTest();
        var result = gotoTest.getTestName("Test");

        assert.equal(result, "Test");
    });

    test("Test name with namespace", () => {
    
        var gotoTest = new GotoTest();
        var result = gotoTest.getTestName("Name.Space.Test");

        assert.equal(result, "Test");
    });
});

function GetSymbol(name: string, kind: vscode.SymbolKind, path: string): vscode.SymbolInformation
{
    return new vscode.SymbolInformation(name,  kind, "", new vscode.Location(vscode.Uri.parse(path), new vscode.Range(new vscode.Position(10, 10), new vscode.Position(20, 20))));
}