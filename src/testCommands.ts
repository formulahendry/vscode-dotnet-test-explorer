import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import * as vscode from "vscode";
import { commands, Disposable, Event, EventEmitter } from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { Executor } from "./executor";
import { Logger } from "./logger";
import { TestDirectories } from "./testDirectories";
import { discoverTests, IDiscoverTestsResult } from "./testDiscovery";
import { TestNode } from "./testNode";
import { ITestResult, TestResult } from "./testResult";
import { parseResults } from "./testResultsFile";
import { Utility } from "./utility";

export interface ITestRunContext {
    testName: string;
    isSingleTest: boolean;
}

export class TestCommands implements Disposable {
    private onTestDiscoveryStartedEmitter = new EventEmitter<string>();
    private onTestDiscoveryFinishedEmitter = new EventEmitter<IDiscoverTestsResult[]>();
    private onTestRunEmitter = new EventEmitter<ITestRunContext>();
    private onNewTestResultsEmitter = new EventEmitter<ITestResult>();
    private onBuildFailedEmitter = new EventEmitter<ITestRunContext>();
    private lastRunTestContext: ITestRunContext = null;
    private testResultsFolder: string;
    private testResultsFolderWatcher: any;

    private isRunning: boolean;

    constructor(
        private testDirectories: TestDirectories) { }

    public dispose(): void {
        try {
            if (this.testResultsFolderWatcher) {
                this.testResultsFolderWatcher.close();
            }
        } catch (err) {
        }
    }

    public discoverTests() {
        this.onTestDiscoveryStartedEmitter.fire("");

        this.testDirectories.clearTestsForDirectory();

        const testDirectories = this.testDirectories.getTestDirectories();

        this.isRunning = false;

        this.setupTestResultFolder();

        const runSeqOrAsync = async () => {

            const addToDiscoveredTests = (discoverdTestResult: IDiscoverTestsResult, dir: string) => {
                if (discoverdTestResult.testNames.length > 0) {
                    discoveredTests.push(discoverdTestResult);
                }
            };

            const discoveredTests = [];

            try {

                if (Utility.runInParallel) {
                    await Promise.all(testDirectories.map(async (dir) => await addToDiscoveredTests(await this.discoverTestsInFolder(dir), dir)));
                } else {
                    for (const dir of testDirectories) {
                        addToDiscoveredTests(await this.discoverTestsInFolder(dir), dir);
                    }
                }

                this.onTestDiscoveryFinishedEmitter.fire(discoveredTests);
            } catch (error) {
                this.onTestDiscoveryFinishedEmitter.fire([]);
            }
        };

        runSeqOrAsync();
    }

    public async discoverTestsInFolder(dir: string): Promise<IDiscoverTestsResult> {
        const testsForDir: IDiscoverTestsResult = await discoverTests(dir, Utility.additionalArgumentsOption);
        this.testDirectories.addTestsForDirectory(testsForDir.testNames.map((tn) => ({ dir, name: tn })));
        return testsForDir;
    }

    public get testResultFolder(): string {
        return this.testResultsFolder;
    }

    public get onTestDiscoveryStarted(): Event<string> {
        return this.onTestDiscoveryStartedEmitter.event;
    }

    public get onTestDiscoveryFinished(): Event<IDiscoverTestsResult[]> {
        return this.onTestDiscoveryFinishedEmitter.event;
    }

    public get onTestRun(): Event<ITestRunContext> {
        return this.onTestRunEmitter.event;
    }

    public get onBuildFail(): Event<ITestRunContext> {
        return this.onBuildFailedEmitter.event;
    }

    public get onNewTestResults(): Event<ITestResult> {
        return this.onNewTestResultsEmitter.event;
    }

    public sendNewTestResults(testResults: ITestResult) {
        this.onNewTestResultsEmitter.fire(testResults);
    }

    public sendRunningTest(testContext: ITestRunContext) {
        this.onTestRunEmitter.fire(testContext);
    }

    public sendBuildFailed(testContext: ITestRunContext) {
        this.onBuildFailedEmitter.fire(testContext);
    }

    public runAllTests(): void {
        this.runTestCommand("", false);
        AppInsightsClient.sendEvent("runAllTests");
    }

    public runTest(test: TestNode): void {
        this.runTestByName(test.fqn, !test.isFolder);
    }

    public runTestByName(testName: string, isSingleTest: boolean): void {
        this.runTestCommand(testName, isSingleTest);
        AppInsightsClient.sendEvent("runTest");
    }

    public debugTestByName(testName: string, isSingleTest: boolean): void {
        this.runTestCommand(testName, isSingleTest, true);
        AppInsightsClient.sendEvent("runTest");
    }

    public rerunLastCommand(): void {
        if (this.lastRunTestContext != null) {
            this.runTestCommand(this.lastRunTestContext.testName, this.lastRunTestContext.isSingleTest);
            AppInsightsClient.sendEvent("rerunLastCommand");
        }
    }

    private setupTestResultFolder(): void {
        if (!this.testResultsFolder) {
            this.testResultsFolder = fs.mkdtempSync(path.join(Utility.pathForResultFile, "test-explorer-"));
        }
    }

    private async runTestCommand(testName: string, isSingleTest: boolean, debug?: boolean): Promise<void> {

        if (this.isRunning) {
            Logger.Log("Tests already running, ignore request to run tests for " + testName);
            return;
        }
        this.isRunning = true;

        commands.executeCommand("workbench.view.extension.test", "workbench.view.extension.test");

        const testDirectories = this
            .testDirectories
            .getTestDirectories(testName);

        if (testDirectories.length < 1) {
            this.isRunning = false;
            Logger.LogWarning("Could not find a matching test directory for test " + testName);
            return;
        }

        Logger.Log(`Test run for ${testName}`);

        for (const { } of testDirectories) {
            const testContext = { testName, isSingleTest };
            this.lastRunTestContext = testContext;
            this.sendRunningTest(testContext);
        }

        try {
            if (Utility.runInParallel) {
                await Promise.all(testDirectories.map(async (dir, i) => this.runTestCommandForSpecificDirectory(dir, testName, isSingleTest, i, debug)));
            } else {
                for (let i = 0; i < testDirectories.length; i++) {
                    await this.runTestCommandForSpecificDirectory(testDirectories[i], testName, isSingleTest, i, debug);
                }
            }
            const globPromise = new Promise<string[]>((resolve, reject) =>
                glob("*.trx",
                    { cwd: this.testResultsFolder, absolute: true },
                    (err, matches) => err == null ? resolve(matches) : reject()));
            const files = await globPromise;
            const allTestResults = [];
            for (const file of files) {
                const testResults = await parseResults(file);
                allTestResults.push(...testResults);
            }
            this.sendNewTestResults({ clearPreviousTestResults: testName === "", testResults: allTestResults });
        } catch (err) {
            Logger.Log(`Error while executing test command: ${err}`);
            if (err.message === "Build command failed") {

                vscode
                    .window
                    .showErrorMessage("Build failed. Fix your build and try to run the test(s) again", "Re-run test(s)",)
                    .then(selection => {
                        vscode.commands.executeCommand("dotnet-test-explorer.rerunLastCommand");
                    });;

                for (const { } of testDirectories) {
                    const testContext = { testName, isSingleTest };
                    this.lastRunTestContext = testContext;
                    this.sendBuildFailed(testContext);
                }
            }
        }

        this.isRunning = false;
    }

    private runBuildCommandForSpecificDirectory(testDirectoryPath: string): Promise<any> {
        return new Promise((resolve, reject) => {

            if (Utility.skipBuild) {
                Logger.Log(`User has passed --no-build, skipping build`);
                resolve();
            } else {
                Logger.Log(`Executing dotnet build in ${testDirectoryPath}`);

                Executor.exec("dotnet build", (err: any, stdout: string) => {
                    if (err) {
                        reject(new Error("Build command failed"));
                    }
                    resolve();
                }, testDirectoryPath);
            }
        });
    }

    private runTestCommandForSpecificDirectory(testDirectoryPath: string, testName: string, isSingleTest: boolean, index: number, debug?: boolean): Promise<any[]> {

        const trxTestName = index + ".trx";

        return new Promise((resolve, reject) => {
            const testResultFile = path.join(this.testResultsFolder, trxTestName);
            let command = `dotnet test${Utility.additionalArgumentsOption} --no-build --logger \"trx;LogFileName=${testResultFile}\"`;

            if (testName && testName.length) {
                if (isSingleTest) {
                    command = command + ` --filter "FullyQualifiedName=${testName.replace(/\(.*\)/g, "")}"`;
                } else {
                    command = command + ` --filter "FullyQualifiedName~${testName.replace(/\(.*\)/g, "")}"`;
                }
            }

            this.runBuildCommandForSpecificDirectory(testDirectoryPath)
                .then(() => {
                    Logger.Log(`Executing ${command} in ${testDirectoryPath}`);

                    if (!debug) {
                        return Executor.exec(command, (err, stdout: string) => {

                            if (err && err.killed) {
                                Logger.Log("User has probably cancelled test run");
                                reject(new Error("UserAborted"));
                            }

                            Logger.Log(stdout, "Test Explorer (Test runner output)");

                            resolve();
                        }, testDirectoryPath, true);
                    } else {
                        return Executor.debug(command, (err, stdout: string) => {

                            if (err && err.killed) {
                                Logger.Log("User has probably cancelled test run");
                                reject(new Error("UserAborted"));
                            }

                            Logger.Log(stdout, "Test Explorer (Test runner output)");

                            resolve();
                        }, testDirectoryPath, true);
                    }

                })
                .catch((err) => {
                    reject(err);
                });
        });
    }
}
