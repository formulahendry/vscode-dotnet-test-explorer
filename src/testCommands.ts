import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { Disposable, Event, EventEmitter } from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { Executor } from "./executor";
import { Logger } from "./logger";
import { IMessagesController } from "./messages";
import { TestDirectories } from "./testDirectories";
import { discoverTests, IDiscoverTestsResult } from "./testDiscovery";
import { TestNode } from "./testNode";
import { TestResult } from "./testResult";
import { TestResultsFile } from "./testResultsFile";
import { Utility } from "./utility";

export class TestCommands {
    private onNewTestDiscoveryEmitter = new EventEmitter<IDiscoverTestsResult[]>();
    private onTestRunEmitter = new EventEmitter<string>();
    private onNewTestResultsEmitter = new EventEmitter<TestResult[]>();
    private testDirectoryPath: string;
    private lastRunTestName: string = null;

    constructor(
        private resultsFile: TestResultsFile,
        private messagesController: IMessagesController,
        private testDirectories: TestDirectories) { }

    /**
     * @description
     * Runs all tests discovered in the project directory.
     * @summary
     * This method can cause the project to rebuild or try
     * to do a restore, so it can be very slow.
     */
    public runAllTests(): void {
        this.runTestCommand("");
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
        this.runTestByName(test.fullName);
    }

    public runTestByName(testName: string): void {
        this.runTestCommand(testName);
        AppInsightsClient.sendEvent("runTest");
    }

    public rerunLastCommand(): void {
        if (this.lastRunTestName != null) {
            this.runTestCommand(this.lastRunTestName);
            AppInsightsClient.sendEvent("rerunLastCommand");
        }
    }

    public discoverTests() {
        this.testDirectories.clearTestsForDirectory();

        Promise.all(this
            .testDirectories
            .getTestDirectories()
            .map( (dir) => {
                return discoverTests(dir, this.getDotNetTestOptions())
                    .then( (discoveredTests: IDiscoverTestsResult) => {
                        this.testDirectories.addTestsForDirectory(discoveredTests.testNames.map( (tn) => ({dir, name: tn})));
                        return discoveredTests;
                    });
            }))
            .then( (results) => {
                this.onNewTestDiscoveryEmitter.fire(results);

                // if (Utility.getConfiguration().get<boolean>("autoWatch")) {
                //     this.runWatchCommand();
                // }
            })
            .catch( (reason) => {
                this.onNewTestDiscoveryEmitter.fire([]);
            });
    }

    public get onNewTestDiscovery(): Event<IDiscoverTestsResult[]> {
        return this.onNewTestDiscoveryEmitter.event;
    }

    public get onTestRun(): Event<string> {
        return this.onTestRunEmitter.event;
    }

    public get onNewTestResults(): Event<TestResult[]> {
        return this.onNewTestResultsEmitter.event;
    }

    // private runWatchCommand(): void {
    //     AppInsightsClient.sendEvent("runWatchCommand");
    //     const command = `dotnet watch test${this.getDotNetTestOptions()}${this.outputTestResults()}`;

    //     Logger.Log(`Executing ${command} in ${this.testDirectoryPath}`);
    //     Executor.runInTerminal(command, this.testDirectoryPath);
    // }

    private runTestCommand(testName: string): void {

        const testDirectories = this
            .testDirectories
            .getTestDirectories(testName);

        const testResults = [];

        // We want to make sure test runs across multiple directories are run in sync to avoid excessive cpu usage
        const runSeq = async () => {

            for (let i = 0; i < testDirectories.length; i++) {
                testResults.push(await this.runTestCommandForSpecificDirectory(testDirectories[i], testName, i));
            }

            const merged = [].concat(...testResults);
            this.onNewTestResultsEmitter.fire(merged);
        };

        runSeq();
    }

    private runTestCommandForSpecificDirectory(testDirectoryPath: string, testName: string, index: number): Promise<TestResult[]> {

        const trxTestName = index + ".trx";

        return new Promise((resolve, reject) => {
            const testResultFile = path.join(Utility.pathForResultFile, "test-explorer", trxTestName);
            let command = `dotnet test${this.getDotNetTestOptions()} --logger \"trx;LogFileName=${testResultFile}\"`;

            if (testName && testName.length) {
                command = command + ` --filter FullyQualifiedName~${testName.replace(/\(.*\)/g, "")}`;
            }

            this.lastRunTestName = testName;
            Logger.Log(`Executing ${command} in ${testDirectoryPath}`);
            this.onTestRunEmitter.fire(testName);

            Executor.exec(command, (err: Error, stdout: string, stderr: string) => {

                Logger.Log(stdout);

                this.resultsFile.parseResults(testResultFile).then( (result) => {
                    resolve(result);
                });
            }, testDirectoryPath);
        });
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
        let testProjectFullPath = this.checkTestDirectoryOption();
        testProjectFullPath = Utility.resolvePath(testProjectFullPath);

        if (!fs.existsSync(testProjectFullPath)) {
            Logger.Log(`Path ${testProjectFullPath} is not valid`);
        }

        this.testDirectoryPath = testProjectFullPath;
    }

    private checkAdditionalArgumentsOption(): string {
        const testArguments = Utility.getConfiguration().get<string>("testArguments");
        return (testArguments && testArguments.length > 0) ? ` ${testArguments}` : "";
    }

    /**
     * @description
     * Gets the options for build/restore before running tests.
     */
    private getDotNetTestOptions(): string {
        return this.checkAdditionalArgumentsOption();
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

}
