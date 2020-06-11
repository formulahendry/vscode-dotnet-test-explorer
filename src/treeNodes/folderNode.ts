import { TreeNode } from "./treeNode";
import { TreeTestState, mergeStates } from "./treeTestState";
import { TestNode } from "./testNode";
export class FolderNode extends TreeNode {
    private _subFolders: FolderNode[] = [];
    private _tests: TestNode[] = [];
    private _state: TreeTestState = "NotRun";
    public readonly fullName: string;
    public get state() { return this._state; }
    private *_children() {
        for (const folder of this._subFolders) {
            yield folder;
        }
        for (const test of this._tests) {
            yield test;
        }
    }
    public get children() { return this._children(); }
    constructor(fullName: string, title: string) {
        super(title);
        this.fullName = fullName;
    }
    public addTestNode(node: TestNode) {
        this._tests.push(node);
        this._nodeChanged.fire();
        node.nodeChanged(() => this.updateState());
    }
    public addFolderNode(node: FolderNode) {
        this._subFolders.push(node);
        this._nodeChanged.fire();
        node.nodeChanged(() => this.updateState());
    }
    private updateState() {
        const newState = this.getNewState();
        if (newState !== this._state) {
            this._state = newState;
            this._nodeChanged.fire();
        }
    }
    private getNewState(): TreeTestState {
        let newState;
        for (const folder of this._subFolders) {
            newState = mergeStates(newState, folder.state);
        }
        for (const test of this._tests) {
            newState = mergeStates(newState, test.state);
        }
        return newState;
    }
}
