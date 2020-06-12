import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import { commands, Disposable, Event, EventEmitter } from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { Executor } from "./executor";
import { Logger } from "./logger";
import { TestDirectories } from "./testDirectories";
import { ITestResult } from "./testResult";
import { Utility } from "./utility";
import { TestResultsListener } from "./testResultsListener";
import { TestNode } from "./treeNodes/testNode";
import { FolderNode } from "./treeNodes/folderNode";
import { TreeNode } from "./treeNodes/treeNode";
import { Watch } from "./watch";

export interface ITestRunContext {
    testName: string;
    isSingleTest: boolean;
}

export class TestCommands implements Disposable {
    private onTestDiscoveryStartedEmitter = new EventEmitter<string>();
    private onTestDiscoveryFinishedEmitter = new EventEmitter<string[]>();
    private onTestRunEmitter = new EventEmitter<ITestRunContext>();
    private onTestRunFinishedEmitter = new EventEmitter<void>();
    private onNewTestResultsEmitter = new EventEmitter<ITestResult[]>();
    public onTestDiscoveryStarted = this.onTestDiscoveryStartedEmitter.event;
    public onTestDiscoveryFinished = this.onTestDiscoveryFinishedEmitter.event;
    public onTestRun = this.onTestRunEmitter.event;
    public onTestRunFinished = this.onTestRunFinishedEmitter.event;
    public onNewTestResults = this.onNewTestResultsEmitter.event;
    private lastRunTestContext: ITestRunContext = null;
    private testResultsFolder: string;

    private isRunning: boolean;

    private watch: Watch;

    constructor(
        private testDirectories: TestDirectories,
        public readonly loggerServer: TestResultsListener) {

        this.watch = new Watch(testDirectories);
        this.onTestDiscoveryFinished(this.updateWatch, this);
    }

    public updateWatch() {
        if (Utility.getConfiguration().get<boolean>("autoWatch")) {
            this.watch.startWatch(
                () => this.onTestRunEmitter.fire({ isSingleTest: false, testName: "" }),
                () => this.onTestRunFinishedEmitter.fire(),
                (results) => this.onNewTestResultsEmitter.fire(results)
            );
        } else {
            this.watch.stopWatch();
        }
    }

    public dispose(): void { }

    public async discoverTests(): Promise<void> {
        this.onTestDiscoveryStartedEmitter.fire("");

        this.testDirectories.clearTestsForDirectory();

        const testDirectories = this.testDirectories.getTestDirectories();

        this.isRunning = false;

        this.setupTestResultFolder();

        const discoveredTests = [];

        const discoverAndAdd = async (dir: string) => {
            const tests = await this.discoverTestsInFolder(dir);
            discoveredTests.push(...tests);
        };


        try {
            if (Utility.runInParallel) {
                await Promise.all(testDirectories.map(async (dir) => await discoverAndAdd(dir)));
            } else {
                for (const dir of testDirectories) {
                    await discoverAndAdd(dir);
                }
            }

            this.onTestDiscoveryFinishedEmitter.fire(discoveredTests);
        } catch (error) {
            this.onTestDiscoveryFinishedEmitter.fire([]);
        }
    }

    public async discoverTestsInFolder(dir: string): Promise<string[]> {
        const discoveredTests: string[] = []
        const subscription = this.loggerServer.onMessage((message) => {
            if (message.type === "discovery") {
                discoveredTests.push(...message.discovered);
            }
        })
        try {
            const command = `dotnet test `
                + `${Utility.additionalArgumentsOption} `
                + `--list-tests `
                + `--verbosity=quiet `
                + `--test-adapter-path "${Utility.loggerPath}" `
                + `--logger "VsCodeLogger;port=${this.loggerServer.port}" `;
            await Executor.exec(command, dir);
        }
        finally {
            subscription.dispose();
        }
        return discoveredTests;
    }

    public sendNewTestResults(testResults: ITestResult[]) {
        this.onNewTestResultsEmitter.fire(testResults);
    }

    public sendRunningTest(testContext: ITestRunContext) {
        this.onTestRunEmitter.fire(testContext);
    }

    public runAllTests(): void {
        this.runTestCommand("", false);
        AppInsightsClient.sendEvent("runAllTests");
    }

    public runTest(test: TreeNode): void {
        if (test instanceof TestNode)
            this.runTestByName(test.fullName, true);
        if (test instanceof FolderNode)
            this.runTestByName(test.fullName, false);
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
            Logger.LogWarning("Could not find a matching test directory for test " + testName);
            return;
        }

        Logger.Log(`Test run for ${testName}`);

        const testContext = { testName, isSingleTest };
        this.lastRunTestContext = testContext;
        this.sendRunningTest(testContext);

        try {
            if (Utility.runInParallel) {
                await Promise.all(testDirectories.map(async (dir, i) => this.runTestCommandForSpecificDirectory(dir, testName, isSingleTest, debug)));
            } else {
                for (const testDirectory of testDirectories) {
                    await this.runTestCommandForSpecificDirectory(testDirectory, testName, isSingleTest, debug);
                }
            }
            this.onTestRunFinishedEmitter.fire();
        } catch (err) {
            Logger.Log(`Error while executing test command: ${err}`);
            this.discoverTests();
        }
        this.isRunning = false;
    }

    private async runBuildCommandForSpecificDirectory(testDirectoryPath: string): Promise<void> {
        if (Utility.skipBuild) {
            Logger.Log(`User has passed --no-build, skipping build`);
        } else {
            const result = await Executor.exec("dotnet build", testDirectoryPath);
            if (result.error) {
                throw new Error("Build command failed");
            }
        }
    }

    private async runTestCommandForSpecificDirectory(testDirectoryPath: string, testName: string, isSingleTest: boolean, debug?: boolean)
        : Promise<void> {
        let command = `dotnet test ${Utility.additionalArgumentsOption} `
            + `--no-build `
            + `--test-adapter-path "${Utility.loggerPath}" `
            + `--logger "VsCodeLogger;port=${this.loggerServer.port}" `;

        if (testName && testName.length) {
            if (isSingleTest) {
                command = command + ` --filter "FullyQualifiedName=${testName.replace(/\(.*\)/g, "")}"`;
            } else {
                command = command + ` --filter "FullyQualifiedName~${testName.replace(/\(.*\)/g, "")}"`;
            }
        }

        await this.runBuildCommandForSpecificDirectory(testDirectoryPath);

        let result;
        if (!debug) {
            result = await Executor.exec(command, testDirectoryPath);
        } else {
            result = await Executor.debug(command, testDirectoryPath);
        }
        if (result.err && result.err.killed) {
            Logger.Log("User has probably cancelled test run");
            throw new Error("UserAborted");
        }

        Logger.Log(result.stdout, ".NET Test Explorer (Test runner output)");
        Logger.Log(result.stderr, ".NET Test Explorer (Test runner output)");
    }
}
