import { TreeNode } from "./treeNode";
import { TreeTestState } from "./treeTestState";
export class TestNode extends TreeNode {
    public readonly fullName: string;
    private _state: TreeTestState = "NotRun";
    public get state() { return this._state; }
    public set state(value: TreeTestState) {
        this._state = value;
        this._nodeChanged.fire();
    }
    constructor(fullName: string, title: string) {
        super(title);
        this.fullName = fullName;
    }
    public get children() { return []; }
}
