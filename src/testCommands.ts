import * as path from "path";
import { Event, EventEmitter } from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { Executor } from "./executor";
import { Logger } from "./logger";
import { TestDirectories } from "./testDirectories";
import { discoverTests, IDiscoverTestsResult } from "./testDiscovery";
import { TestNode } from "./testNode";
import { TestResult } from "./testResult";
import { TestResultsFile } from "./testResultsFile";
import { Utility } from "./utility";

export class TestCommands {
    private onTestDiscoveryStartedEmitter = new EventEmitter<string>();
    private onTestDiscoveryFinishedEmitter = new EventEmitter<IDiscoverTestsResult[]>();
    private onTestRunEmitter = new EventEmitter<string>();
    private onNewTestResultsEmitter = new EventEmitter<TestResult[]>();
    private lastRunTestName: string = null;

    constructor(
        private resultsFile: TestResultsFile,
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
        this.onTestDiscoveryStartedEmitter.fire();

        this.testDirectories.clearTestsForDirectory();

        // We want to make sure test discovery across multiple directories are run in sequence to avoid excessive cpu usage
        const runSeq = async () => {

            const discoveredTests = [];

            try {
                for (const dir of this.testDirectories.getTestDirectories()) {
                    const testsForDir: IDiscoverTestsResult = await discoverTests(dir, Utility.additionalArgumentsOption);
                    this.testDirectories.addTestsForDirectory(testsForDir.testNames.map( (tn) => ({dir, name: tn})));
                    discoveredTests.push(testsForDir);
                }

                this.onTestDiscoveryFinishedEmitter.fire(discoveredTests);
            } catch (error) {
                this.onTestDiscoveryFinishedEmitter.fire([]);
            }
        };

        runSeq();
    }

    public get onTestDiscoveryStarted(): Event<string> {
        return this.onTestDiscoveryStartedEmitter.event;
    }

    public get onTestDiscoveryFinished(): Event<IDiscoverTestsResult[]> {
        return this.onTestDiscoveryFinishedEmitter.event;
    }

    public get onTestRun(): Event<string> {
        return this.onTestRunEmitter.event;
    }

    public get onNewTestResults(): Event<TestResult[]> {
        return this.onNewTestResultsEmitter.event;
    }

    public sendNewTestResults(testResults: TestResult[]) {
        this.onNewTestResultsEmitter.fire(testResults);
    }

    private runTestCommand(testName: string): void {

        const testDirectories = this
            .testDirectories
            .getTestDirectories(testName);

        const testResults = [];

        // We want to make sure test runs across multiple directories are run in sequence to avoid excessive cpu usage
        const runSeq = async () => {

            for (let i = 0; i < testDirectories.length; i++) {
                testResults.push(await this.runTestCommandForSpecificDirectory(testDirectories[i], testName, i));
            }

            const merged = [].concat(...testResults);
            this.sendNewTestResults(merged);
        };

        runSeq();
    }

    private runTestCommandForSpecificDirectory(testDirectoryPath: string, testName: string, index: number): Promise<TestResult[]> {

        const trxTestName = index + ".trx";

        return new Promise((resolve) => {
            const testResultFile = path.join(Utility.pathForResultFile, "test-explorer", trxTestName);
            let command = `dotnet test${Utility.additionalArgumentsOption} --logger \"trx;LogFileName=${testResultFile}\"`;

            if (testName && testName.length) {
                command = command + ` --filter FullyQualifiedName~${testName.replace(/\(.*\)/g, "")}`;
            }

            this.lastRunTestName = testName;
            Logger.Log(`Executing ${command} in ${testDirectoryPath}`);
            this.onTestRunEmitter.fire(testName);

            Executor.exec(command, (err: Error, stdout: string) => {

                Logger.Log(stdout);

                this.resultsFile.parseResults(testResultFile).then( (result) => {
                    resolve(result);
                });
            }, testDirectoryPath);
        });
    }
}
