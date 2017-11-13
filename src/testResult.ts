export class TestResult {
    public constructor(private _name: string, private _outcome: string) {
    }

    public get testName(): string {
        return this._name;
    }

    public get outcome(): string {
        return this._outcome;
    }
}
