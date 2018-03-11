export class TestNode {
    private _isError: boolean;
    private _isLoading: boolean;

    constructor(private _parentPath: string, private _name: string, private _children?: TestNode[]) {
    }

    public get name(): string {
        return this._name;
    }

    public get fullName(): string {
        return (this._parentPath ? `${this._parentPath}.` : "") + this._name;
    }

    public get isFolder(): boolean {
        return this._children && this._children.length > 0;
    }

    public get children(): TestNode[] {
        return this._children;
    }

    public get isError(): boolean {
        return !!this._isError;
    }

    public get icon(): string {
        return this._isLoading ? "spinner.svg" : "run.png";
    }

    public setAsError(error: string) {
        this._isError = true;
        this._name = error;
    }

    public setAsLoading() {
        this._isLoading = true;
        this._name = "Discovering tests";
    }
}
