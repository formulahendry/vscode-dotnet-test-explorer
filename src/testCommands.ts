import * as chokidar from "chokidar";
import * as fs from "fs";
import * as path from "path";
import { commands, Disposable, Event, EventEmitter } from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { Executor } from "./executor";
import { Logger } from "./logger";
import { TestDirectories } from "./testDirectories";
import { discoverTests, IDiscoverTestsResult } from "./testDiscovery";
import { TestNode } from "./testNode";
import { ITestResult, TestResult } from "./testResult";
import { TestResultsFile } from "./testResultsFile";
import { Utility } from "./utility";

export interface IWaitForAllTests {
    numberOfTestDirectories: number;
    currentNumberOfFiles: number;
    expectedNumberOfFiles: number;
    testResults: TestResult[];
    clearPreviousTestResults: boolean;
}

export interface ITestRunContext {
    testName: string;
    isSingleTest: boolean;
}

export class TestCommands implements Disposable {
    private onTestDiscoveryStartedEmitter = new EventEmitter<string>();
    private onTestDiscoveryFinishedEmitter = new EventEmitter<IDiscoverTestsResult[]>();
    private onTestRunEmitter = new EventEmitter<ITestRunContext>();
    private onNewTestResultsEmitter = new EventEmitter<ITestResult>();
    private lastRunTestContext: ITestRunContext = null;
    private testResultsFolder: string;
    private testResultsFolderWatcher: any;
    private waitForAllTests: IWaitForAllTests;

    constructor(
        private resultsFile: TestResultsFile,
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
        this.onTestDiscoveryStartedEmitter.fire();

        this.testDirectories.clearTestsForDirectory();

        const testDirectories = this.testDirectories.getTestDirectories();

        this.waitForAllTests = {
            currentNumberOfFiles: 0,
            expectedNumberOfFiles: 0,
            testResults: [],
            clearPreviousTestResults: false,
            numberOfTestDirectories: testDirectories.length,
        };

        this.setupTestResultFolder();

        const runSeqOrAsync = async () => {

            const addToDiscoveredTests = (discoverdTestResult: IDiscoverTestsResult, dir: string) => {
                if (discoverdTestResult.testNames.length <= 0) {
                    this.testDirectories.removeTestDirectory(dir);
                } else {
                    discoveredTests.push(discoverdTestResult);
                }
            };

            const discoveredTests = [];

            try {

                if (Utility.runInParallel) {
                    await Promise.all(testDirectories.map( async (dir) => await addToDiscoveredTests(await this.discoverTestsInFolder(dir), dir)));
                } else {
                    for (const dir of testDirectories) {
                        addToDiscoveredTests(await this.discoverTestsInFolder(dir), dir);
                    }
                }

                // Number of test directories might have been decreased due to none-test directories being added by the glob / workspace filter
                this.waitForAllTests.numberOfTestDirectories = this.testDirectories.getTestDirectories().length;

                this.onTestDiscoveryFinishedEmitter.fire(discoveredTests);
            } catch (error) {
                this.onTestDiscoveryFinishedEmitter.fire([]);
            }
        };

        runSeqOrAsync();
    }

    public async discoverTestsInFolder(dir: string): Promise<IDiscoverTestsResult> {
        const testsForDir: IDiscoverTestsResult = await discoverTests(dir, Utility.additionalArgumentsOption);
        this.testDirectories.addTestsForDirectory(testsForDir.testNames.map( (tn) => ({dir, name: tn})));
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

    public get onNewTestResults(): Event<ITestResult> {
        return this.onNewTestResultsEmitter.event;
    }

    public sendNewTestResults(testResults: ITestResult) {
        this.onNewTestResultsEmitter.fire(testResults);
    }

    public sendRunningTest(testContext: ITestRunContext) {
        this.onTestRunEmitter.fire(testContext);
    }

    public watchRunningTests(namespace: string): void {
        const textContext = {testName: namespace, isSingleTest: false};
        this.sendRunningTest(textContext);
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
            const me = this;

            this.testResultsFolder = fs.mkdtempSync(path.join(Utility.pathForResultFile, "test-explorer-"));
            this.testResultsFolderWatcher = chokidar.watch("*.trx", { cwd: this.testResultsFolder}).on("add", (p) => {

                Logger.Log("New test results file");

                me.resultsFile.parseResults(path.join(me.testResultsFolder, p))
                .then( (testResults) => {
                    me.waitForAllTests.currentNumberOfFiles = me.waitForAllTests.currentNumberOfFiles + 1;
                    me.waitForAllTests.testResults = me.waitForAllTests.testResults.concat(testResults);

                    Logger.Log(`Parsed ${me.waitForAllTests.currentNumberOfFiles}/${me.waitForAllTests.expectedNumberOfFiles} file(s)`);

                    if ((me.waitForAllTests.numberOfTestDirectories === 1) || (me.waitForAllTests.currentNumberOfFiles >= me.waitForAllTests.expectedNumberOfFiles)) {

                        Logger.Log(`Parsed all expected test results, updating tree`);

                        me.sendNewTestResults({clearPreviousTestResults: me.waitForAllTests.clearPreviousTestResults, testResults: me.waitForAllTests.testResults});

                        this.waitForAllTests.currentNumberOfFiles = 0;
                        this.waitForAllTests.expectedNumberOfFiles =  0;
                        this.waitForAllTests.testResults = [];
                        this.waitForAllTests.clearPreviousTestResults = false;
                    }
                });
            });
        }
    }

    private runTestCommand(testName: string, isSingleTest: boolean, debug?: boolean): void {

        if (this.waitForAllTests.expectedNumberOfFiles > 0) {
            Logger.Log("Tests already running, ignore request to run tests for " + testName);
            return;
        }

        commands.executeCommand("workbench.view.extension.test", "workbench.view.extension.test");

        const testDirectories = this
            .testDirectories
            .getTestDirectories(testName);

        if (testDirectories.length < 1) {
            Logger.LogWarning("Could not find a matching test directory for test " + testName);
            return;
        }

        if (testName === "") {
            this.waitForAllTests.expectedNumberOfFiles = this.waitForAllTests.numberOfTestDirectories;
            this.waitForAllTests.clearPreviousTestResults = true;
        } else {
            this.waitForAllTests.expectedNumberOfFiles = 1;
        }

        Logger.Log(`Test run for ${testName}, expecting ${this.waitForAllTests.expectedNumberOfFiles} test results file(s) in total`) ;

        for (const {} of testDirectories) {
            const testContext = {testName, isSingleTest};
            this.lastRunTestContext = testContext;
            this.sendRunningTest(testContext);
        }

        const runSeqOrAsync = async () => {

            try {
                if (Utility.runInParallel) {
                    await Promise.all(testDirectories.map( async (dir, i) => this.runTestCommandForSpecificDirectory(dir, testName, isSingleTest, i, debug)));
                } else {
                    for (let i = 0; i < testDirectories.length; i++) {
                        await this.runTestCommandForSpecificDirectory(testDirectories[i], testName, isSingleTest, i, debug);
                    }
                }
            } catch (err) {
                Logger.Log(`Error while executing test command: ${err}`);
                this.discoverTests();
            }
        };

        runSeqOrAsync();
    }

    private runBuildCommandForSpecificDirectory(testDirectoryPath: string): Promise<any>  {
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
                .then( () => {
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
                .catch( (err) => {
                    reject(err);
                });
        });
    }
}
