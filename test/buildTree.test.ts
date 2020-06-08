import * as assert from "assert";
import { buildTree, ITestTreeNode, mergeSingleItemTrees } from "../src/buildTree";
import { IParsedName } from "../src/parseTestName";

suite("buildTree", () => {
    function buildParsedName(parts: string[]): IParsedName {
        const segments = [];
        let totalLength = 0;
        for (const part of parts) {
            segments.push({ start: totalLength, end: totalLength + part.length });
            totalLength += part.length + 1;
        }
        return {
            fullName: parts.join("."),
            segments,
        };
    }
    function buildParsedNames(...parts: string[][]) {
        return parts.map(buildParsedName);
    }

    test("A single test creates a chain-like tree", () => {
        const parsedNames = buildParsedNames(
            ["Namespace", "Fixture", "Test"],
        );
        const tree = buildTree(parsedNames);

        assert.deepEqual(tree, {
            fullName: "",
            name: "",
            subTrees: new Map([
                ["Namespace", {
                    fullName: "Namespace",
                    name: "Namespace",
                    subTrees: new Map([
                        ["Fixture", {
                            fullName: "Namespace.Fixture",
                            name: "Fixture",
                            subTrees: new Map(),
                            tests: ["Test"],
                        }],
                    ]),
                    tests: [],
                }],
            ]),
            tests: [],
        } as ITestTreeNode);
    });

    test("Two tests from the same class go into same node", () => {
        const parsedNames = buildParsedNames(
            ["Namespace", "Fixture", "Test1"],
            ["Namespace", "Fixture", "Test2"],
        );
        const tree = buildTree(parsedNames);

        assert.deepEqual(tree, {
            fullName: "",
            name: "",
            subTrees: new Map([
                ["Namespace", {
                    fullName: "Namespace",
                    name: "Namespace",
                    subTrees: new Map([
                        ["Fixture", {
                            fullName: "Namespace.Fixture",
                            name: "Fixture",
                            subTrees: new Map(),
                            tests: ["Test1", "Test2"],
                        }],
                    ]),
                    tests: [],
                }],
            ]),
            tests: [],
        } as ITestTreeNode);
    });

    test("Namespaces with the same prefixes are merged", () => {
        const parsedNames = buildParsedNames(
            ["Namespace", "Fixture1", "Test1"],
            ["Namespace", "Fixture2", "Test2"],
        );
        const tree = buildTree(parsedNames);

        assert.deepEqual(tree, {
            fullName: "",
            name: "",
            subTrees: new Map([
                ["Namespace", {
                    fullName: "Namespace",
                    name: "Namespace",
                    subTrees: new Map([
                        ["Fixture1", {
                            fullName: "Namespace.Fixture1",
                            name: "Fixture1",
                            subTrees: new Map(),
                            tests: ["Test1"],
                        }],
                        ["Fixture2", {
                            fullName: "Namespace.Fixture2",
                            name: "Fixture2",
                            subTrees: new Map(),
                            tests: ["Test2"],
                        }],
                    ]),
                    tests: [],
                }],
            ]),
            tests: [],
        } as ITestTreeNode);
    });
});

suite("mergeTree", () => {
    test("Namespaced are flattened", () => {
        const tree: ITestTreeNode = {
            fullName: "Namespace",
            name: "Namespace",
            subTrees: new Map([
                ["Fixture", {
                    fullName: "Namespace.Fixture",
                    name: "Fixture",
                    subTrees: new Map(),
                    tests: ["Test"],
                }],
            ]),
            tests: [],
        };
        const expected: ITestTreeNode = {
            fullName: "Namespace.Fixture",
            name: "Namespace.Fixture",
            subTrees: new Map(),
            tests: ["Test"],
        };

        const merged = mergeSingleItemTrees(tree);

        assert.deepEqual(merged, expected);
    });
    test("Namespaced are flattened recursively", () => {
        const tree: ITestTreeNode = {
            fullName: "Namespace",
            name: "Namespace",
            subTrees: new Map([
                ["SubNamespace", {
                    fullName: "Namespace.SubNamespace",
                    name: "SubNamespace",
                    subTrees: new Map([
                        ["Fixture", {
                            fullName: "Namespace.SubNamespace.Fixture",
                            name: "Fixture",
                            subTrees: new Map(),
                            tests: ["Test"],
                        }],
                    ]),
                    tests: [],
                }],
            ]),
            tests: [],
        };
        const expected: ITestTreeNode = {
            fullName: "Namespace.SubNamespace.Fixture",
            name: "Namespace.SubNamespace.Fixture",
            subTrees: new Map(),
            tests: ["Test"],
        };

        const merged = mergeSingleItemTrees(tree);

        assert.deepEqual(merged, expected);
    });
    test("Single tests are not flattened", () => {
        const tree: ITestTreeNode = {
            fullName: "Namespace",
            name: "Namespace",
            subTrees: new Map([
                ["Fixture1", {
                    fullName: "Namespace.Fixture1",
                    name: "Fixture1",
                    subTrees: new Map(),
                    tests: ["Test1"],
                }],
                ["Fixture2", {
                    fullName: "Namespace.Fixture2",
                    name: "Fixture2",
                    subTrees: new Map(),
                    tests: ["Test2"],
                }],
            ]),
            tests: [],
        };

        const merged = mergeSingleItemTrees(tree);

        assert.deepEqual(merged, tree);
    });
});
