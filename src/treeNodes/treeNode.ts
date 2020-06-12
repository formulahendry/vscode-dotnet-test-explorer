import * as vscode from "vscode";

export abstract class TreeNode {
    protected readonly _nodeChanged = new vscode.EventEmitter<void>();
    public readonly nodeChanged = this._nodeChanged.event;
    public readonly label: string;
    constructor(label: string) {
        this.label = label;
    }
    public abstract get children(): Iterable<TreeNode>;
}
