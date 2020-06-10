import * as assert from "assert";
import * as vscode from "vscode";
import {TestNode} from "../src/testNode";
import { ITestResult, Outcome } from "../src/testResult";

suite("Icon tests", () => {

    test("Node that is loading", () => {
        const node = new TestNode("", "Loading node", null);
        node.setAsLoading();

        assert.equal(node.icon, "spinner.svg");
    });

    test("Folder with no test result", () => {
        const node = new TestNode("", "Folder node", null, [new TestNode("parent", "child", null)]);

        assert.equal(node.icon, "namespace.png");
    });

    test("Folder with one failed test result", () => {
        const testResult = [
            GetTestResult("Passed", "NameSpace.MyClass", "NameSpace.MyClass.Test1"),
            GetTestResult("Passed", "NameSpace.MyClass", "NameSpace.MyClass.Test2"),
            GetTestResult("Failed", "NameSpace.MyClass", "NameSpace.MyClass.Test3"),
        ];
        const node = new TestNode("NameSpace", "MyClass", testResult, [new TestNode("parent", "child", null)]);

        assert.equal(node.icon, "namespaceFailed.png");
    });

    test("Folder with one not executed test result", () => {
        const testResult = [
            GetTestResult("Passed", "NameSpace.MyClass", "NameSpace.MyClass.Test1"),
            GetTestResult("Skipped", "NameSpace.MyClass", "NameSpace.MyClass.Test2"),
            GetTestResult("Passed", "NameSpace.MyClass", "NameSpace.MyClass.Test3"),
        ];
        const node = new TestNode("NameSpace", "MyClass", testResult, [new TestNode("parent", "child", null)]);

        assert.equal(node.icon, "namespaceNotExecuted.png");
    });

    test("Folder with all passed test result", () => {
        const testResult = [
            GetTestResult("Passed", "NameSpace.MyClass", "NameSpace.MyClass.Test1"),
            GetTestResult("Passed", "NameSpace.MyClass", "NameSpace.MyClass.Test2"),
            GetTestResult("Passed", "NameSpace.MyClass", "NameSpace.MyClass.Test3"),
        ];
        const node = new TestNode("NameSpace", "MyClass", testResult, [new TestNode("parent", "child", null)]);

        assert.equal(node.icon, "namespacePassed.png");
    });

    test("Folder with all passed test result (none xunit result file)", () => {
        // mstest and nunit present only the method name whereas xunit includes the full namespace and class name
        const testResult = [
            GetTestResult("Passed", "NameSpace.MyClass", "Test1"),
            GetTestResult("Passed", "NameSpace.MyClass", "Test2"),
            GetTestResult("Passed", "NameSpace.MyClass", "Test3"),
        ];
        const node = new TestNode("NameSpace", "MyClass", testResult, [new TestNode("parent", "child", null)]);

        assert.equal(node.icon, "namespacePassed.png");
    });

    test("Test with no test result", () => {
        const node = new TestNode("", "Test node", null);

        assert.equal(node.icon, "run.png");
    });

    test("Test with passed test result", () => {
        const testResult = [GetTestResult("Passed", "NameSpace.MyClass", "NameSpace.MyClass.Test1")];
        const node = new TestNode("NameSpace.MyClass", "Test1", testResult);

        assert.equal(node.icon, "testPassed.png");
    });

    test("Test with failed test result", () => {
        const testResult = [GetTestResult("Failed", "NameSpace.MyClass", "NameSpace.MyClass.Test1")];
        const node = new TestNode("NameSpace.MyClass", "Test1", testResult);

        assert.equal(node.icon, "testFailed.png");
    });

    test("Test with not executed test result", () => {
        const testResult = [GetTestResult("Skipped", "NameSpace.MyClass", "NameSpace.MyClass.Test1")];
        const node = new TestNode("NameSpace.MyClass", "Test1", testResult);

        assert.equal(node.icon, "testNotExecuted.png");
    });
});

function GetTestResult(outcome: Outcome, fullName: string, dummy: string): ITestResult {
    throw new Error("Not implemented");
    return {fullName, outcome, message: "", stackTrace: ""}
}
