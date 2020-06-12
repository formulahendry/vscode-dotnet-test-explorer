import * as assert from "assert";
import * as vscode from "vscode";
import { Problems } from "../src/problems";
import { ITestResult, Outcome } from "../src/testResult";

suite("Problems tests", () => {

    test("Test results without stacktrace", () => {
        const results = [GetTestResult("1", "Passed", "", "")];

        const problems = Problems.createProblemsFromResults(results);
        assert.equal(problems.length, 0);
    });

    test("One results with stacktrace", () => {
        const results = [GetTestResult("1", "Passed", "Some assert error", " Bla bla bla  at XunitTests.InnerC.Get() in D:\\xunittests\\TestClass1.cs:line 43")];

        const problems = Problems.createProblemsFromResults(results);
        assert.equal(problems["D:\\xunittests\\TestClass1.cs"].length, 1);
        assert.equal(problems["D:\\xunittests\\TestClass1.cs"][0].message, "Some assert error");
    });

    test("One results with multiple stacktrace returns last link", () => {
        const results = [
            GetTestResult("1", "Failed", "Some assert error", `
                at XunitTests.InnerC.Get() in D:\\xunittests\\TestClass1.cs:line 43
                at XunitTests.TestClass1.Fail() in D:\\xunittests\\TestClass1.cs:line 24`,
            ),
        ];

        const problems = Problems.createProblemsFromResults(results);

        assert.equal(problems["D:\\xunittests\\TestClass1.cs"].length, 1);
        assert.equal(problems["D:\\xunittests\\TestClass1.cs"][0].range.start.line, 23); // range is 0 based, so line 24 = 23.
    });

    test("Two results with stacktrace in different files", () => {
        const results = [
            GetTestResult("1", "Failed", "Some assert error", "  at XunitTests.InnerC.Get() in D:\\xunittests\\TestClass1.cs:line 43"),
            GetTestResult("2", "Failed", "Another assert error", "  at XunitTests.InnerC.Get() in D:\\xunittests\\TestClass2.cs:line 43"),
        ];

        const problems = Problems.createProblemsFromResults(results);

        assert.equal(problems["D:\\xunittests\\TestClass1.cs"].length, 1);
        assert.equal(problems["D:\\xunittests\\TestClass1.cs"][0].message, "Some assert error");

        assert.equal(problems["D:\\xunittests\\TestClass2.cs"].length, 1);
        assert.equal(problems["D:\\xunittests\\TestClass2.cs"][0].message, "Another assert error");
    });

    test("Two results with stacktrace in same file", () => {
        const results = [
            GetTestResult("1", "Failed", "Some assert error", "  at XunitTests.InnerC.Get() in D:\\xunittests\\TestClass1.cs:line 43"),
            GetTestResult("2", "Failed", "Another assert error", "  at XunitTests.InnerC.Get() in D:\\xunittests\\TestClass1.cs:line 83"),
        ];

        const problems = Problems.createProblemsFromResults(results);
        assert.equal(problems["D:\\xunittests\\TestClass1.cs"].length, 2);
        assert.equal(problems["D:\\xunittests\\TestClass1.cs"][0].message, "Some assert error");
        assert.equal(problems["D:\\xunittests\\TestClass1.cs"][1].message, "Another assert error");

    });
});

function GetTestResult(fullName: string, outcome: Outcome, message: string, stackTrace: string) {
    return { fullName, outcome, message, stackTrace };
}
