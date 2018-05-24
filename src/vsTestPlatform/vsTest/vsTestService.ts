/*
MIT License

Copyright (c) 2017 Gabriel Parelli Francischini

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/


import { TestModel, Test } from "./vsTestModel";
import { VSTestSession } from "./vsTestSession";
import Event, { Emitter } from "./base/common/Event";
import { IVSTestConfig } from "./vsTestConfig";
const fs = require('fs');
const glob = require("glob");

import { VSTestDotNetModel } from "../vsTestDotNet/vsTestDotNetModel";

/**
 * VSTest.console status
 */
export enum VSTestServiceStatus {
    Connected,
    Disconnected
}

/**
 * The test service responsible for update the model and start the vstest session
 */
export class VSTestService {
    /**
     * The test model that. Always updated!
     */
    protected testModel: TestModel;

    /**
     * Our current vstest session
     */
    protected session: VSTestSession;

    protected workspace: string;

    /**
     * Event notification about service status changes
     */
    protected _onDidTestServiceStatusChanged: Emitter<VSTestServiceStatus>;

    protected _onDidTestServiceDebugLaunchRequest: Emitter<VSTestProtocol.TestRunnerProcessStartInfoResponse>;

    constructor(workspace: string, adapterName: string, config: IVSTestConfig) {

        this.updateConfiguration(adapterName, config);

        this._onDidTestServiceStatusChanged = new Emitter<VSTestServiceStatus>();
        this._onDidTestServiceDebugLaunchRequest = new Emitter<VSTestProtocol.TestRunnerProcessStartInfoResponse>();

        this.workspace = workspace;

    }

    public updateConfiguration(adapterName: string, config: IVSTestConfig) {
        //TODO: add list of adapter supported
        if (adapterName == "dotnet") {
            this.testModel = new VSTestDotNetModel(config);
        }
        else {
            this.testModel = new TestModel(config);
        }
    }

    /**
     * Return our current test model
     */
    public getModel(): TestModel {
        return this.testModel;
    }

    public getSession(): VSTestSession {
        return this.session;
    }

    /**
     * Register a new listeener for the test service status change
     */
    public get onDidTestServiceStatusChanged(): Event<VSTestServiceStatus> {
        return this._onDidTestServiceStatusChanged.event;
    }


    public get onDidTestServiceDebugLaunchRequest(): Event<VSTestProtocol.TestRunnerProcessStartInfoResponse> {
        return this._onDidTestServiceDebugLaunchRequest.event;
    }

    /**
     * Start a new instance of the vstest session
     */
    public startTestRunner(): Promise<void> {
        return this.createSessionProcess();
    }

    /**
     * Create a new vstest sesssion process by starting a new process. Also send the initialize message
     */
    private createSessionProcess(): Promise<void> {
        this.session = new VSTestSession();
        this.registerSessionListeners();

        return this.session.initialize(this.workspace, this.getAdditionalTestAdapters());
    }

    private getAdditionalTestAdapters(): Array<string> {
        // FIXME: had to comment the below because it was crapping it out.
        return null; // this.getModel().getAdditionalTestAdapters(this.workspace);
    }

    /**
     * Register the session listener to keep our model updated!
     */
    private registerSessionListeners() {
        this.session.onDidTestDiscovered((tests: Array<VSTestProtocol.TestCase>) => {
            tests.forEach((test) => {
                this.testModel.addTest(test);
            });
        });

        this.session.onDidTestSessionConnected(() => {
            //session connect, should call ui?
            this._onDidTestServiceStatusChanged.fire(VSTestServiceStatus.Connected);
        });

        this.session.onDidTestExecutionStatsChanged((testRunStatistics: VSTestProtocol.TestRunStatisticsResult) => {
            testRunStatistics.NewTestResults.forEach((newTestResult) => {
                this.getModel().updateTestResult(newTestResult);
            })
            testRunStatistics.ActiveTests.forEach((activeTest) => {
                this.getModel().updateTestState(activeTest);
            })
        });
    }



    /**
     * Discover the files in the given directory
     * @param directory The directory path do discvery the tests
     */
    public discoveryTests(directory: string): Promise<VSTestProtocol.TestDiscoveryResult> {
        return new Promise((resolve, reject) => {
            try {
                this.getModel().reset();

                const sourcesToDiscovery = this.getModel().getAllFilesInTestFolder(directory);
                if (sourcesToDiscovery[0].files.length === 0) {
                    resolve(null);
                    return;
                }

                this.session.discoveryTests(sourcesToDiscovery[0].files, sourcesToDiscovery[0].runSettings);

                this.session.onDidTestDiscoveryCompleted((testDiscoveryResults) => {
                    if (testDiscoveryResults.LastDiscoveredTests) {
                        testDiscoveryResults.LastDiscoveredTests.forEach((testCase: VSTestProtocol.TestCase) => {
                            this.getModel().addTest(testCase);
                        });
                    }
                    console.log(this.testModel.getTests()[0]);
                    resolve(testDiscoveryResults);
                })
            }
            catch (err) {
                //this.testRunnerOutputChannel.appendLine(err.message);
                reject();
            }
        });

    }

    /**
     * Run a set of tests 
     * @param tests The set of test to run
     * @param debuggingEnabled 
     */
    public runTests(tests: Array<Test>, debuggingEnabled: boolean = false): Promise<VSTestProtocol.TestRunCompleteResult> {
        if (!tests) {
            return Promise.resolve(null);
        }
        return new Promise((resolve, reject) => {
            try {
                this.testModel.incrementRunTestSessionId();
                const testCases = new Array<any>();
                let sources = new Array<string>();
                tests.forEach((test) => {
                    testCases.push(test.plainObject);
                    sources.push(test.source);
                })

                sources = sources.filter((v, i, a) => a.indexOf(v) === i);

                this.session.runTests(sources, testCases, this.getModel().getRunSettings(), debuggingEnabled);

                this.session.onDidTestExecutionCompleted((testExecutionResults) => {
                    if(testExecutionResults.LastRunTests) {
                        testExecutionResults.LastRunTests.NewTestResults.forEach((testResult : VSTestProtocol.TestResult) => {
                            this.getModel().updateTestResult(testResult);
                        })
                    }
                    resolve(testExecutionResults);
                })
            }
            catch (err) {
                //this.testRunnerOutputChannel.appendLine(err.message);
                reject();
            }
        });
    }

    public stopService() {
        return this.session.stopServer();
    }

    /**
     * Run a set of tests 
     * @param tests The set of test to run
     * @param debuggingEnabled 
     */
    public debugTests(tests: Array<Test>, debuggingEnabled: boolean = false): Promise<VSTestProtocol.TestRunCompleteResult> {
        if (!tests) {
            return Promise.resolve(null);
        }
        return new Promise((resolve, reject) => {
            try {
                this.testModel.incrementRunTestSessionId();
                const testCases = new Array<any>();
                let sources = new Array<string>();
                tests.forEach((test) => {
                    testCases.push(test.plainObject);
                    sources.push(test.source);
                })

                sources = sources.filter((v, i, a) => a.indexOf(v) === i);

                this.session.onDidTestHostLaunched((event : VSTestProtocol.TestRunnerProcessStartInfoResponse) => {
                    this._onDidTestServiceDebugLaunchRequest.fire(event);
                });

                this.session.debugTests(sources, testCases, this.getModel().getRunSettings(), debuggingEnabled);

                this.session.onDidTestExecutionCompleted((testExecutionResults) => {
                    if(testExecutionResults.LastRunTests) {
                        testExecutionResults.LastRunTests.NewTestResults.forEach((testResult : VSTestProtocol.TestResult) => {
                            this.getModel().updateTestResult(testResult);
                        })
                    }
                    resolve(testExecutionResults);
                })
            }
            catch (err) {
                //this.testRunnerOutputChannel.appendLine(err.message);
                reject();
            }
        });
    }
}