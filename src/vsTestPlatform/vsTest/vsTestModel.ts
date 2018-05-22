import Event, { Emitter } from "./base/common/Event";
import * as Collections from "typescript-collections";
import { IVSTestConfig } from "./vsTestConfig";
import { GlobSync } from "glob"
import * as path from "path"
/**
 * The enumerator that describe the test outcome results
 */
export enum TestOutcome {
    //None. Test case doesn't have an outcome.
    None = 0x0,
    //Passed
    Passed = 0x1,
    //Failed
    Failed = 0x2,
    //Skipped
    Skipped = 0x3,
    //Not found. Test case was not found during execution.
    NotFound = 0x4,
}

/**
 * Class that handle the test results
 */
export class TestResult {
    /**
     * TestResult.DisplayName provides a friendly name for the test result.
     */
    displayName: string;

    /**
     * TestResult.Duration provides the entire duration of this test case execution.
     */
    duration: string;

    /**
     * TestResult.ErrorMessage provides an error message if the test failed.
     */
    errorMessage: string;

    /**
     * TestResult.ErrorStackTrace provides the stack trace for the error.
     */
    errorStackTrace: string;

    /**
     * TestResult.Outcome provides an integer specifying the result of a test case execution.
     */
    outcome: TestOutcome;

    /**
     * TestResult.StartTime provides the start time of the test case execution.
     */
    startTime: Date;

    /**
     * TestResult.EndTime provides the end time of test case execution.
     */
    endTime: Date;

    /**
     * The plain test result object
     */
    plainObject: VSTestProtocol.TestResult;

    sessionId: number;

    /**
     * Return the test duration in milliseconds
     */
    public getDurationInMilliseconds(): number {
        return this.endTime.getTime() - this.startTime.getTime();
    }
}

/**
 * The test case implementation
 */
export class Test {
    /**
     * The unique id of the test
     */
    id: string;

    /**
     * TestCase.FullyQualifiedName represents the unique name for a test case.
     */
    fullyQualifiedName: string;

    /**
     * TestCase.ExecutorUri represents the Adapter which owns this test case.
     */
    executorUri: string;

    /**
     * TestCase.Source is the path to the test container which contains the source of this test case.
     */
    source: string;

    /**
     * TestCase.DisplayName represents a user friendly notation for the test case. An editor or a runner can choose to show this to user.
     */
    displayName: string;

    /**
     * Is the test enabled for running
     */
    isEnabled: boolean

    /**
     * The name of the test class
     */
    testClassName: string;

    /**
     * Line number where the test lies
     */
    lineNumber: number;

    /**
     * The source file of the test
     */
    codeFilePath: string;

    /**
     * TestCase.Traits are a set of <Key, Value> pair of additional data related to a test case. User can use these values to filter tests. An editor or runner may show this to user.
     */
    traits: string;

    /**
     * The test result
     */
    result: TestResult;

    /**
     * Plain test object
     */
    plainObject: VSTestProtocol.TestCase;

    /**
     * Is the test running right now?
     */
    isRunning: boolean = false;

    /**
     * Return the unique test id
     */
    public getId(): string {
        return this.id;
    }

    /**
     * Return the test display name
     */
    public getDisplayName(): string {
        if (this.result) {
            return `${this.displayName} - ${this.result.getDurationInMilliseconds()} ms`;
        }
        return this.displayName;
    }

    /**
     * Return the line number where the test lies
     */
    public getLineNumber(): number {
        return this.lineNumber;
    }

    /**
     * Return the source code of the test
     */
    public getCodeFilePath(): string {
        return this.codeFilePath;
    }

    /**
     * Return any test children
     */
    public getChildren(): Array<Test> {
        return null;
    }

    /**
     * Return the test result
     */
    public getResult(): TestResult {
        return this.result
    }
}

/**
 * Model responsible for holding the current test information
 */
export class TestModel {
    /**
     * Collection of tests discovered on the solution
     */
    private tests: Collections.Dictionary<string, Test> = new Collections.Dictionary<string, Test>();

    /**
     * Event notification emitted when test case change (new test, update)
     */
    private _onDidTestChanged: Emitter<Test>;

    /**
     * Current configuration
     */
    protected config: IVSTestConfig;


    protected runTestSessionId = 0;

    protected defaultRunSettings: string = "<RunSettings><RunConfiguration><TargetFrameworkVersion>.NETCoreApp,Version=v1.0</TargetFrameworkVersion></RunConfiguration></RunSettings>";

    public incrementRunTestSessionId() {
        this.runTestSessionId++;
    }

    public getRunTestSessionId() {
        return this.runTestSessionId;
    }

    public constructor(config: IVSTestConfig) {
        this._onDidTestChanged = new Emitter<Test>();

        this.config = config;


    }

    public getRunSettings() {
        return this.defaultRunSettings;
    }

    public getConfig(): IVSTestConfig {
        return this.config;
    }

    /**
     * Return a array list of all test available
     */
    public getTests(): Array<Test> {
        return this.tests.values();
    }

    /**
     * Return a array list of all failed tests
     */
    public getFailedTests(): Array<Test> {
        const tests = this.getTests().filter((test: Test) => {
            if (test.result && test.result.outcome === TestOutcome.Failed) {
                return true;
            }
            return false
        });
        return tests;
    }

    /**
    * Return a array list of all passed tests
    */
    public getPassedTests(): Array<Test> {
        const tests = this.getTests().filter((test: Test) => {
            if (test.result && test.result.outcome === TestOutcome.Passed) {
                return true;
            }
            return false
        });
        return tests;
    }

    /**
    * Return a array list of all not run tests
    */
    public getNotRunTests(): Array<Test> {
        const tests = this.getTests().filter((test: Test) => {
            if (!test.result || test.result.outcome === TestOutcome.None) {
                return true;
            }
            return false;
        });
        return tests;
    }

    /**
    * Return a array list of all slow tests
    */
    public getSlowTests(): Array<Test> {
        const tests = this.getTests().filter((test: Test) => {
            if (test.result && test.result.getDurationInMilliseconds() > 1000) {
                return true;
            }
            return false;
        });
        return tests;
    }

    /**
    * Return a array list of all slow tests
    */
    public getMediumTests(): Array<Test> {
        const tests = this.getTests().filter((test: Test) => {
            if (test.result && (test.result.getDurationInMilliseconds() >= 100 && test.result.getDurationInMilliseconds() <= 1000)) {
                return true;
            }
            return false;
        });
        return tests;
    }

    /**
    * Return a array list of all slow tests
    */
    public getFastTests(): Array<Test> {
        const tests = this.getTests().filter((test: Test) => {
            if (test.result && test.result.getDurationInMilliseconds() < 100) {
                return true;
            }
            return false;
        });
        return tests;
    }

    /**
     * Register a new listeener for the test changed
     */
    public get onDidTestChanged(): Event<Test> {
        return this._onDidTestChanged.event;
    }

    /**
     * Update a test by assigning a result
     * @param testResult 
     */
    public updateTestResult(testResult: VSTestProtocol.TestResult) {
        const test = this.createTest(testResult.TestCase);
        test.result = this.createTestResult(testResult);
        test.result.sessionId = this.runTestSessionId;
        test.isRunning = false;
        this.tests.setValue(test.id, test);
        this._onDidTestChanged.fire(test);
    }

    /**
     * Create a testresult based on the protocol
     * @param testResult
     */
    private createTestResult(testResult: VSTestProtocol.TestResult): TestResult {
        const newTestResult: TestResult = new TestResult();
        newTestResult.plainObject = testResult;

        testResult.Properties.forEach(properties => {
            switch (properties.Key.Id) {
                case "TestResult.Outcome":
                    newTestResult.outcome = parseInt(<string>properties.Value, 10);
                    break;
                case "TestResult.ErrorMessage":
                    newTestResult.errorMessage = <string>properties.Value;
                    break;
                case "TestResult.ErrorStackTrace":
                    newTestResult.errorStackTrace = <string>properties.Value;
                    break;
                case "TestResult.DisplayName":
                    newTestResult.displayName = <string>properties.Value;
                    break;
                case "TestResult.ComputerName":
                    //newTestResult.computerName = properties.Value;
                    break;
                case "TestResult.Duration":
                    newTestResult.duration = <string>properties.Value;
                    break;
                case "TestResult.StartTime":
                    newTestResult.startTime = new Date(<string>properties.Value);
                    break;
                case "TestResult.EndTime":
                    newTestResult.endTime = new Date(<string>properties.Value);
                    break;
            }
        });
        return newTestResult;
    }


    /**
     * Create a test based on the protocol
     * @param test 
     */
    public createTest(test: VSTestProtocol.TestCase): Test {
        const newTest = new Test();
        newTest.plainObject = test;
        test.Properties.forEach(properties => {
            switch (properties.Key.Id) {
                case "TestCase.FullyQualifiedName":
                    newTest.fullyQualifiedName = <string>properties.Value;
                    break;
                case "TestCase.ExecutorUri":
                    newTest.executorUri = <string>properties.Value;
                    break;
                case "TestCase.Source":
                    newTest.source = <string>properties.Value;
                    break;
                case "TestCase.DisplayName":
                    newTest.displayName = <string>properties.Value;
                    break;
                case "MSTestDiscovererv2.IsEnabled":
                    newTest.isEnabled = <boolean>properties.Value;
                    break;
                case "MSTestDiscovererv2.TestClassName":
                    newTest.testClassName = <string>properties.Value;
                    break;
                case "TestCase.LineNumber":
                    newTest.lineNumber = parseInt(properties.Value.toString(), 10);
                    break;
                case "TestCase.Traits":
                    newTest.traits = <string>properties.Value;
                    break;
                case "TestCase.Id":
                    newTest.id = <string>properties.Value;
                    break;
                case "TestCase.CodeFilePath":
                    newTest.codeFilePath = <string>properties.Value;
                    break;
            }
        });
        return newTest;
    }

    /**
     * Add a new test to the collection
     * @param test 
     */
    public addTest(test: VSTestProtocol.TestCase): void {
        const newTest: Test = this.createTest(test);
        this.tests.setValue(newTest.id, newTest);
        this._onDidTestChanged.fire(newTest);
    }

    public updateTestState(test: VSTestProtocol.TestCase): void {
        const newTest: Test = this.createTest(test);
        newTest.isRunning = true;
        if(this.tests.containsKey(newTest.id)) {
            newTest.result = this.tests.getValue(newTest.id).getResult();
        }
        this.tests.setValue(newTest.id, newTest);
        this._onDidTestChanged.fire(newTest);
    }


    /**
     * Retrieve all file in the directory that match the glob configuration
     * @param directory The base directory to lookup for the files
     */
    public getAllFilesInTestFolder(directory: string): Array<ISourceToDiscovery> {
        /*const globPattern = `${directory}/${this.getConfig().glob}`;
        const fileTestList = new GlobSync(globPattern, null).found;

        const sourcesToDiscovery = new Array<ISourceToDiscovery>();

        //fileTestList.forEach((file) => {
            sourcesToDiscovery.push({
                files: fileTestList,
                runSettings: this.getRunSettings()
            });
        //});*/

        const sourcesToDiscovery = new Array<ISourceToDiscovery>();
        sourcesToDiscovery.push({
            files: new Array<string>(),
            runSettings: this.getRunSettings()
        })

        const fileName = path.join(directory, this.getConfig().output, this.getConfig().framework, this.getConfig().outputFileName);

        sourcesToDiscovery[0].files.push(fileName);

        return sourcesToDiscovery;
    }

    public reset() {
        this.tests.clear();

        this._onDidTestChanged.fire(null);
    }

    public getAdditionalTestAdapters(workspace : string) : Array<string> {
        return null;
    }

}

export interface ISourceToDiscovery {
    files: Array<string>,
    runSettings: string
}