export class TestResult {
    private className: string;
    private method: string;

    public constructor(private _testId: string, private _outcome: string) {
    }

    public get fullName(): string {
        return this.className + "." + this.method;
    }

    public get id(): string {
        return this._testId;
    }

    public get outcome(): string {
        return this._outcome;
    }

    public matches(className: string, method: string): boolean {
        // The passed in class name won't have the namespace, hence the
        // check with endsWith
        return (this.method === method) && this.className.endsWith(className);
    }

    public updateName(className: string, method: string): void {
        this.className = className;

        // xUnit includes the class name in the name of the unit test
        // i.e. classname.method
        if (method.startsWith(className)) {
            this.method = method.substring(className.length + 1); // +1 to include the .
        } else {
            this.method = method;
        }
    }
}
