import * as path from "path";
import * as vscode from "vscode";
import { Disposable, Event, EventEmitter } from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { Executor } from "./executor";
import { discoverTests } from "./testDiscovery";
import { TestNode } from "./testNode";
import { TestResultsFile } from "./testResultsFile";
import { Utility } from "./utility";

export class TestCommands {
    private onNewTestDiscoveryEmitter = new EventEmitter<string[]>();
    private testDirectoryPath: string;

    constructor(private resultsFile: TestResultsFile) { }

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
        Executor.runInTerminal(`dotnet test${this.getDotNetTestOptions()}${this.outputTestResults()} --filter FullyQualifiedName~${test.fullName}`, this.testDirectoryPath);
        AppInsightsClient.sendEvent("runTest");
    }

    public discoverTests() {
        this.evaluateTestDirectory();

        discoverTests(this.testDirectoryPath, this.getDotNetTestOptions())
            .then((result) => this.onNewTestDiscoveryEmitter.fire(result))
            .catch(() => this.onNewTestDiscoveryEmitter.fire([]));
    }

    public get onNewTestDiscovery(): Event<string[]> {
        return this.onNewTestDiscoveryEmitter.event;
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
}
