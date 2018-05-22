
import { VSTestService, VSTestServiceStatus } from "../../vsTest/vsTestService";
import { VSTestServiceIDE } from "../vsTest/vsTestServiceIDE";
import * as vscode from "vscode";
import { TestOutputChannel } from "../console/testOutputChannel"
/**
 * Test Manager is too much here.. need to rethink this
 */
export class TestManager {
    private testService: VSTestServiceIDE;
    public testOutputChannel: TestOutputChannel;

    /**
     * The singleton TestManager
     */
    private static _instance: TestManager = null;

    /**
     * @returns the singleton TestManager
     */
    public static getInstance(): TestManager {
        return this._instance;
    }

    public getTestService(): VSTestService {
        return this.testService;
    }

    /**
     * Initialize the Test Manager
     * @param context The visual studio code context
     */
    public static initialize(context: vscode.ExtensionContext, workspace : string): Promise<void> {
        this._instance = new TestManager(context);
        return this._instance.start(workspace);
    }

    constructor(private context: vscode.ExtensionContext) {
        this.testOutputChannel = new TestOutputChannel();
    }

    public start(workspace : string): Promise<void> {
        this.testService = new VSTestServiceIDE(workspace);

        return new Promise<void>((resolve, reject) => {
            this.testService.startTestRunner().then(() => {
                this.registerListener();
                resolve();
            });
        });
    }

    public restart(workspace : string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.testService) {
                this.testService.stopService().then(() => {
                    this.start(workspace);
                    resolve();
                });
            }
            else {
                return this.start(workspace);
            }
        });
    }

    private registerListener() {
        this.testService.onDidTestServiceStatusChanged((serviceStatus) => {
            this.testOutputChannel.appendData(`Service Status: ${serviceStatus}`);
        });

        this.testService.getSession().onDidTestDiscoveryCompleted((testDiscoveryResult: VSTestProtocol.TestDiscoveryResult) => {
            if (testDiscoveryResult) {
                this.testOutputChannel.appendData(`Total test found: ${testDiscoveryResult.TotalTests}`);
            }
            else {
                this.testOutputChannel.appendData(`Total test found: 0. Error?`);
            }
        });

        this.testService.getSession().onDidTestExecutionCompleted((testRunCompleteResult: VSTestProtocol.TestRunCompleteResult) => {
            if (testRunCompleteResult) {
                this.testOutputChannel.appendData(`Total test time: ${testRunCompleteResult.TestRunCompleteArgs.ElapsedTimeInRunningTests}`);
                this.testOutputChannel.appendData(`Executed Tests: ${testRunCompleteResult.TestRunCompleteArgs.TestRunStatistics.ExecutedTests}`);
            }
        });

        this.testService.getSession().onDidTestSessionMessageReceived((message: VSTestProtocol.MessageResult) => {
            this.testOutputChannel.appendData(message.Message);
        });
    }
}