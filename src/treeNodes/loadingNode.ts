import { TreeNode } from "./treeNode";
export class LoadingNode extends TreeNode {
    constructor() { super("Discovering tests"); }
    public get children(): Iterable<TreeNode> { return []; }
}
