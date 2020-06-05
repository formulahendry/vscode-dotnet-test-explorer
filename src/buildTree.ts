import { IParsedName } from "./parseTestName";

/**
 * This is an "abstract" version of a tree node, containing the logical structure
 * of the tree, but not anything more concrete like icon, test state, commands etc.
 */
export interface ITestTreeNode {
    fullName: string;
    name: string;
    subTrees: Map<string, ITestTreeNode>;
    tests: string[];
}

export function buildTree(parsedNames: IParsedName[]): ITestTreeNode {
    const root: ITestTreeNode = { fullName: "", name: "", subTrees: new Map(), tests: [] };
    for (const parsedName of parsedNames) {
        let currentNode = root;

        for (const segment of parsedName.segments) {
            const part = parsedName.fullName.substr(segment.start, segment.end - segment.start);
            const fullName = parsedName.fullName.substr(0, segment.end);
            if (!currentNode.subTrees.has(part)) {
                const newTree: ITestTreeNode = {
                    fullName,
                    name: part,
                    subTrees: new Map(),
                    tests: [],
                };
                currentNode.subTrees.set(part, newTree);
                currentNode = newTree;
            } else {
                currentNode = currentNode.subTrees.get(part);
            }
        }
    }
    return root;
}

/**
 * Merges nodes in the tree that contain only a single element.
 *
 * E.g. this:
 *
 *    a
 *    |- b
 *       |- c
 *       |- d
 *
 * is made into this:
 *
 *    a.b
 *    |- c
 *    |- d
 *
 *
 * @param tree The input tree.
 * @returns A new tree with merged nodes.
 */
export function mergeSingleItemTrees(tree: ITestTreeNode): ITestTreeNode {
    if (tree.tests.length === 0
        && tree.subTrees.size === 1) {
        let [[, childTree]] = tree.subTrees;
        childTree = mergeSingleItemTrees(childTree);
        return {
            ...childTree,
            name: tree.name === "" ? childTree.name : `${tree.name}.${childTree.name}`,
        };
    } else {
        const subTrees = new Map<string, ITestTreeNode>(Array.from(
            tree.subTrees.values(),
            (childNamespace) => {
                const merged = mergeSingleItemTrees(childNamespace);
                return [merged.name, merged] as [string, ITestTreeNode];
            }));
        return { ...tree, subTrees };
    }
}
