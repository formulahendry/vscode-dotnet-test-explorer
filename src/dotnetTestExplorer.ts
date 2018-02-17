import * as path from "path";
import * as vscode from "vscode";
import { TreeDataProvider, TreeItem, TreeItemCollapsibleState } from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { Executor } from "./executor";
import { TestNode } from "./testNode";
import { TestResultsFile } from "./testResultsFile";
import { Utility } from "./utility";

export class DotnetTestExplorer implements TreeDataProvider<TestNode> {
    public _onDidChangeTreeData: vscode.EventEmitter<any> = new vscode.EventEmitter<any>();
    public readonly onDidChangeTreeData: vscode.Event<any> = this._onDidChangeTreeData.event;

    /**
     * The directory where the dotnet-cli will
     * execute commands.
     */
    private testDirectoryPath: string;

    constructor(private context: vscode.ExtensionContext, private resultsFile: TestResultsFile) { }

    /**
     * @description
     * Refreshes the test explorer pane by running the
     * `dotnet test` command and requesting information about
     * discovered tests.
     * @summary
     * This method can cause the project to rebuild or try
     * to do a restore, so it can be very slow.
     */
    public refreshTestExplorer(): void {
        this._onDidChangeTreeData.fire();
        AppInsightsClient.sendEvent("refreshTestExplorer");
    }

    /**
     * @description
     * Runs all tests discovered in the project directory.
     * @summary
     * This method can cause the project to rebuild or try
     * to do a restore, so it can be very slow.
     */
    public runAllTests(): void {
        this.evaluateTestDirectory();
        Executor.runInTerminal(`dotnet test${this.getDotNetTestOptions()}${this.outputTestResults()}`, this.testDirectoryPath);
        AppInsightsClient.sendEvent("runAllTests");
    }

    /**
     * @description
     * Runs a specific test discovered from the project directory.
     * @summary
     * This method can cause the project to rebuild or try
     * to do a restore, so it can be very slow.
     */
    public runTest(test: TestNode): void {
        Executor.runInTerminal(`dotnet test${this.getDotNetTestOptions()}${this.outputTestResults()} --filter FullyQualifiedName=${test.fullName}`, this.testDirectoryPath);
        AppInsightsClient.sendEvent("runTest");
    }

    public getTreeItem(element: TestNode): TreeItem {
        if (element.isError) {
            return new TreeItem(element.name);
        }

        return {
            label: element.name,
            collapsibleState: element.isFolder ? TreeItemCollapsibleState.Collapsed : void 0,
            iconPath: {
                dark: this.context.asAbsolutePath(path.join("resources", "dark", "run.png")),
                light: this.context.asAbsolutePath(path.join("resources", "light", "run.png")),
            },
        };
    }

    public getChildren(element?: TestNode): TestNode[] | Thenable<TestNode[]> {
        if (element) {
            return element.children;
        }

        const useTreeView = Utility.getConfiguration().get<string>("useTreeView");

        return this.loadTestStrings().then((fullNames: string[]) => {
            if (!useTreeView) {
                return fullNames.map((name) => {
                    return new TestNode("", name);
                });
            }

            const structuredTests = {};

            fullNames.forEach((name: string) => {
                // this regex matches test names that include data in them - for e.g.
                //  Foo.Bar.BazTest(p1=10, p2="blah.bleh")
                const match = /([^\(]+)(.*)/g.exec(name);
                if (match && match.length > 1) {
                    const parts = match[1].split(".");
                    if (match.length > 2 && match[2].trim().length > 0) {
                        // append the data bit of the test to the test method name
                        // so we can distinguish one test from another in the explorer
                        // pane
                        const testMethodName = parts[parts.length - 1];
                        parts[parts.length - 1] = testMethodName + match[2];
                    }
                    this.addToObject(structuredTests, parts);
                }
            });

            const root = this.createTestNode("", structuredTests);
            return root;
        }, (reason: any) => {
            return reason.map((e) => {
                const item = new TestNode("", null);
                item.setAsError(e);
                return item;
            });
        });
    }

    private addToObject(container: object, parts: string[]): void {
        const title = parts.splice(0, 1)[0];

        if (parts.length > 1) {
            if (!container[title]) {
                container[title] = {};
            }
            this.addToObject(container[title], parts);
        } else {
            if (!container[title]) {
                container[title] = [];
            }

            if (parts.length === 1) {
                container[title].push(parts[0]);
            }
        }
    }

    private createTestNode(parentPath: string, test: object | string): TestNode[] {
        if (Array.isArray(test)) {
            return test.map((t) => {
                return new TestNode(parentPath, t);
            });
        } else if (typeof test === "object") {
            return Object.keys(test).map((key) => {
                return new TestNode(parentPath, key, this.createTestNode((parentPath ? `${parentPath}.` : "") + key, test[key]));
            });
        } else {
            return [new TestNode(parentPath, test)];
        }
    }

    /**
     * @description
     * Checks to see if the options specify that the dotnet-cli
     * should run `dotnet build` before loading tests.
     * @summary
     * If this is set to **false**, then `--no-build` is passed into the
     * command line arguments. It is prefixed by a space only if **false**.
     */
    private checkBuildOption(): string {
        const option = Utility.getConfiguration().get<boolean>("build");
        return option ? "" : " --no-build";
    }

    /**
     * @description
     * Checks to see if the options specify that the dotnet-cli
     * should run `dotnet restore` before loading tests.
     * @summary
     * If this is set to **false**, then `--no-restore` is passed into the
     * command line arguments. It is prefixed by a space only if **false**.
     */
    private checkRestoreOption(): string {
        const option = Utility.getConfiguration().get<boolean>("restore");
        return option ? "" : " --no-restore";
    }

    /**
     * @description
     * Gets the options for build/restore before running tests.
     */
    private getDotNetTestOptions(): string {
        return this.checkBuildOption() + this.checkRestoreOption();
    }

    /**
     * @description
     * Gets the dotnet test argument to speicfy the output for the test results.
     */
    private outputTestResults(): string {
        if (Utility.codeLensEnabled) {
            return " --logger \"trx;LogFileName=" + this.resultsFile.fileName + "\"";
        } else {
            return "";
        }
    }

    /**
     * @description
     * Checks to see if the options specify a directory to run the
     * dotnet-cli test commands in.
     * @summary
     * This will use the project root by default.
     */
    private checkTestDirectoryOption(): string {
        const option = Utility.getConfiguration().get<string>("testProjectPath");
        return option ? option : vscode.workspace.rootPath;
    }

    /**
     * @description
     * Executes the `dotnet test -t` command from the dotnet-cli to
     * try and discover tests.
     */
    private loadTestStrings(): Thenable<string[]> {
        this.evaluateTestDirectory();
        // TODO check testDirectoryPath is valid and contains a test.csproj file.

        const testDirPath = this.testDirectoryPath;
        return new Promise((c, e) => {
            try {
                const results = Executor
                    .execSync(`dotnet test -t -v=q${this.getDotNetTestOptions()}`, testDirPath)
                    .split(/[\r\n]+/g)
                    /*
                     * The dotnet-cli prefixes all discovered unit tests
                     * with whitespace. We can use this to drop any lines of
                     * text that are not relevant, even in complicated project
                     * structures.
                     **/
                    .filter((item) => item && item.startsWith("  "))
                    .sort((a, b) => a > b ? 1 : b > a ? - 1 : 0)
                    .map((item) => item.trim());

                c(results);

            } catch (error) {
                return e(["Please open or set the test project", "and ensure your project compiles!"]);
            }

            return c([]);
        });
    }

    /**
     * @description
     * Checks to see if the @see{vscode.workspace.rootPath} is
     * the same as the directory given, and resolves the correct
     * string to it if not.
     * @param dir
     * The directory specified in the options.
     */
    private resolvePath(dir: string): string {
        return path.isAbsolute(dir)
            ? dir
            : path.resolve(vscode.workspace.rootPath, dir);
    }

    /**
     * @description
     * Discover the directory where the dotnet-cli
     * will execute commands, taken from the options.
     * @summary
     * This will be the @see{vscode.workspace.rootPath}
     * by default.
     */
    private evaluateTestDirectory(): void {
        const testProjectFullPath = this.checkTestDirectoryOption();
        this.testDirectoryPath = this.resolvePath(testProjectFullPath);
    }
}
