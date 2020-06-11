import * as assert from "assert";
import * as vscode from "vscode";
import { GotoTest } from "../src/gotoTest";
const TestNode : any = undefined; // TODO: migrate tests
import { Utility } from "../src/utility";

suite("Get test method name", () => {

    test("Test name without namespace", () => {

        const gotoTest = new GotoTest();
        const result = Utility.getFqnTestName("Test");

        assert.equal(result, "Test");
    });

    test("XUnit theory name without namespace", () => {

        const gotoTest = new GotoTest();
        const result = Utility.getFqnTestName("Test(param: value)");

        assert.equal(result, "Test");
    });

    test("Test name with namespace", () => {

        const gotoTest = new GotoTest();
        const result = Utility.getFqnTestName("Name.Space.Test");

        assert.equal(result, "Name.Space.Test");
    });

    test("XUnit theory name with namespace", () => {

        const gotoTest = new GotoTest();
        const result = Utility.getFqnTestName("Name.Space.Test(param: value)");

        assert.equal(result, "Name.Space.Test");
    });

    test("XUnit theory name with opening parentheses", () => {

        const gotoTest = new GotoTest();
        const result = Utility.getFqnTestName("Name.Space.TestName(()");

        assert.equal(result, "Name.Space.TestName");
    });

    test("XUnit theory name with closing parentheses with following chars", () => {

        const gotoTest = new GotoTest();
        const result = Utility.getFqnTestName("Name.Space.TestName()A)");

        assert.equal(result, "Name.Space.TestName");
    });

    test("XUnit theory name with dots inside the parentheses", () => {

        const gotoTest = new GotoTest();
        const result = Utility.getFqnTestName("XunitTests.TestClass3.WithDot(value: \"With.Dot\", value2: 5,5)");

        assert.equal(result, "XunitTests.TestClass3.WithDot");
    });

    test("NUnit test fixture", () => {

        const gotoTest = new GotoTest();
        const result = Utility.getFqnTestName("Nunit.FixtureClass(\"Hello Also.Dotted\").WithTestCase(\"Case here.)A\")");

        assert.equal(result, "Nunit.FixtureClass.WithTestCase");
    });
});