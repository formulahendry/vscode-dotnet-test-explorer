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
import { ITestResult } from "./testResult";
import { TestResultsFile } from "./testResultsFile";
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
    private lastRunTestContext: ITestRunContext = null;
    private testResultsFolder: string;
    private testResultsFolderWatcher: any;

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

        this.setupTestResultFolder();

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

    public watchRunningTests(namespace: string): void {
        const textContext = {testName: namespace, isSingleTest: false};
        this.onTestRunEmitter.fire(textContext);
    }

    public runAllTests(): void {
        this.runTestCommand("", false);
        AppInsightsClient.sendEvent("runAllTests");
    }

    public runTest(test: TestNode): void {
        this.runTestByName(test.fullName, !test.isFolder);
    }

    public runTestByName(testName: string, isSingleTest: boolean): void {
        this.runTestCommand(testName, isSingleTest);
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
                me.resultsFile.parseResults(path.join(me.testResultsFolder, p))
                .then( (testResults) => {
                    me.sendNewTestResults({clearPreviousTestResults: false, testResults});
                });
            });
        }
    }

    private runTestCommand(testName: string, isSingleTest: boolean): void {

        commands.executeCommand("workbench.view.extension.test", "workbench.view.extension.test");

        const testDirectories = this
            .testDirectories
            .getTestDirectories(testName);

        const testResults = [];

        // We want to make sure test runs across multiple directories are run in sequence to avoid excessive cpu usage
        const runSeq = async () => {

            try {
                for (let i = 0; i < testDirectories.length; i++) {
                    testResults.push(await this.runTestCommandForSpecificDirectory(testDirectories[i], testName, isSingleTest, i));
                }

                const merged = [].concat(...testResults);
                this.sendNewTestResults({ clearPreviousTestResults: false, testResults: merged});
            } catch (err) {
                Logger.Log(`Error while executing test command: ${err}`);
                this.discoverTests();
            }
        };

        runSeq();
    }

    private runBuildCommandForSpecificDirectory(testDirectoryPath: string): Promise<any>  {
        return new Promise((resolve, reject) => {

            if (Utility.additionalArgumentsOption.indexOf("--no-build") > -1) {
                Logger.Log(`User has passed --no-build, skipping build`);
                resolve();
            } else {
                Logger.Log(`Executing dotnet build in ${testDirectoryPath}`);

                Executor.exec("dotnet build", (err, stdout: string) => {
                    if (err) {
                        reject(new Error("Build command failed"));
                    }
                    resolve();
                }, testDirectoryPath);
            }
        });
    }

    private runTestCommandForSpecificDirectory(testDirectoryPath: string, testName: string, isSingleTest: boolean, index: number): Promise<any[]> {

        const trxTestName = index + ".trx";

        const textContext = {testName, isSingleTest};

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

            this.lastRunTestContext = textContext;

            this.onTestRunEmitter.fire(textContext);

            this.runBuildCommandForSpecificDirectory(testDirectoryPath)
                .then( () => {
                    Logger.Log(`Executing ${command} in ${testDirectoryPath}`);

                    return Executor.exec(command, (err, stdout: string) => {

                        if (err && err.killed) {
                            Logger.Log("User has probably cancelled test run");
                            reject(new Error("UserAborted"));
                        }

                        Logger.Log(stdout);

                        resolve();
                    }, testDirectoryPath, true);
                })
                .catch( (err) => {
                    reject(err);
                });
        });
    }
}
