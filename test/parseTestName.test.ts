import * as assert from "assert";
import { parseTestName } from "../src/parseTestName";

suite("parseTestName - test names are parsed correctly", () => {
    function testParsing(input, expected) {
        test(`${input} -> ${expected.map((x) => `"${x}"`).join(" ")}`, () => {
            const result = parseTestName(input);
            assert.equal(result.fullName, input);
            const segmentsAsStrings = result.segments.map(
                (segment) => input.substr(segment.start, segment.end - segment.start));
            assert.deepEqual(segmentsAsStrings, expected);
        });
    }
    testParsing("a.b.c", ["a", "b", "c"]);
    testParsing("a.b.c()", ["a", "b", "c()"]);
    testParsing("a.b.c().d", ["a", "b", "c()", "d"]);

    testParsing("a.b.c('.')", ["a", "b", "c('.')"]);
    testParsing("a.b.c('.').d", ["a", "b", "c('.')", "d"]);
    testParsing('a.b.c(".").d', ["a", "b", 'c(".")', "d"]);
    testParsing('a.b.c("\\".").d', ["a", "b", 'c("\\".")', "d"]);
    testParsing('a.b.c(".").d(".")', ["a", "b", 'c(".")', 'd(".")']);
    testParsing("a.b.c(typeof(X.Y))", ["a", "b", "c(typeof(X.Y))"]);
    testParsing("a.b.c(typeof(X.Y), '.')", ["a", "b", "c(typeof(X.Y), '.')"]);
    testParsing("a.b.c('.', typeof(X.Y))", ["a", "b", "c('.', typeof(X.Y))"]);

    testParsing('MyNamespace.MyFixture("my.fixture.parameter").MyTest("my.test.parameter")',
        ["MyNamespace", 'MyFixture("my.fixture.parameter")', 'MyTest("my.test.parameter")']);
});
