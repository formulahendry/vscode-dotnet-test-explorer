import { TreeNode } from "./treeNode";
import { TreeTestState, mergeStates } from "./treeTestState";
import { TestNode } from "./testNode";
export class FolderNode extends TreeNode {
    private _subFolders: FolderNode[] = [];
    private _tests: TestNode[] = [];
    private _state: TreeTestState;
    public readonly fullName: string;
    public get state() { return this._state; }
    private setState(newState: TreeTestState) {
        if (newState !== this._state) {
            this._state = newState;
            this._nodeChanged.fire();
        }
    }
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
        this.setState(mergeStates(this.state, node.state));
    }
    public addFolderNode(node: FolderNode) {
        this._subFolders.push(node);
        this._nodeChanged.fire();
        node.nodeChanged(() => this.updateState());
        this.setState(mergeStates(this.state, node.state));
    }
    private updateState() {
        this.setState(this.getNewState());
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
