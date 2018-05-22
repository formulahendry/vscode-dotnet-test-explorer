import cp = require("child_process");
import { TPromise } from "./base/common/winjs.base";
import Event, { Emitter } from "./base/common/Event";
import net = require("net");
import stream = require("stream");
import { BinaryReader } from "./binary/binaryReader";
import { BinaryWriter } from "./binary/binaryWriter";
import { RawProtocolSession } from "./rawProtocolSession";
import * as freeport from "freeport";
/**
 * Implements the VSTest Protocol
 */
export class VSTestSession extends RawProtocolSession {
    private _onDidTestSessionConnected: Emitter<void>;
    private _onDidTestDiscovered: Emitter<Array<VSTestProtocol.TestCase>>;
    private _onDidTestDiscoveryCompleted: Emitter<VSTestProtocol.TestDiscoveryResult>;
    private _onDidTestExecutionStatsChanged: Emitter<VSTestProtocol.TestRunStatisticsResult>;
    private _onDidTestExecutionCompleted: Emitter<VSTestProtocol.TestRunCompleteResult>;
    private _onDidTestSessionMessageReceived: Emitter<VSTestProtocol.MessageResult>;
    private _onDidTestHostLaunched: Emitter<VSTestProtocol.TestRunnerProcessStartInfoResponse>;

    constructor() {
        super();
        this._onDidTestSessionConnected = new Emitter<void>();
        this._onDidTestDiscovered = new Emitter<Array<VSTestProtocol.TestCase>>();
        this._onDidTestDiscoveryCompleted = new Emitter<VSTestProtocol.TestDiscoveryResult>();
        this._onDidTestExecutionStatsChanged = new Emitter<VSTestProtocol.TestRunStatisticsResult>();
        this._onDidTestExecutionCompleted = new Emitter<VSTestProtocol.TestRunCompleteResult>();
        this._onDidTestSessionMessageReceived = new Emitter<VSTestProtocol.MessageResult>();
        this._onDidTestHostLaunched = new Emitter<VSTestProtocol.TestRunnerProcessStartInfoResponse>();
    }

    public get onDidTestHostLaunched(): Event<VSTestProtocol.TestRunnerProcessStartInfoResponse> {
        return this._onDidTestHostLaunched.event;
    }

    public get onDidTestSessionConnected(): Event<void> {
        return this._onDidTestSessionConnected.event;
    }

    public get onDidTestExecutionCompleted(): Event<VSTestProtocol.TestRunCompleteResult> {
        return this._onDidTestExecutionCompleted.event;
    }

    public get onDidTestExecutionStatsChanged(): Event<VSTestProtocol.TestRunStatisticsResult> {
        return this._onDidTestExecutionStatsChanged.event;
    }

    public get onDidTestDiscovered(): Event<Array<VSTestProtocol.TestCase>> {
        return this._onDidTestDiscovered.event;
    }

    public get onDidTestDiscoveryCompleted(): Event<VSTestProtocol.TestDiscoveryResult> {
        return this._onDidTestDiscoveryCompleted.event;
    }

    public get onDidTestSessionMessageReceived(): Event<VSTestProtocol.MessageResult> {
        return this._onDidTestSessionMessageReceived.event;
    }

    /**
     * Parses and notify listener for the received message 
     * @param message The message rcv
     */
    protected onProtocolMessage(message: VSTestProtocol.ProtocolMessage): void {
        switch (message.MessageType) {
            case "TestSession.Connected":
                this._onDidTestSessionConnected.fire();
                break;
            case "TestDiscovery.TestFound":
                this._onDidTestDiscovered.fire(<Array<VSTestProtocol.TestCase>>message.Payload);
                break;
            case "TestDiscovery.Completed":
                this._onDidTestDiscoveryCompleted.fire(<VSTestProtocol.TestDiscoveryResult>message.Payload);
                break;
            case "TestExecution.StatsChange":
                this._onDidTestExecutionStatsChanged.fire(<VSTestProtocol.TestRunStatisticsResult>message.Payload);
                break;
            case "TestExecution.Completed":
                this._onDidTestExecutionCompleted.fire(<VSTestProtocol.TestRunCompleteResult>message.Payload);
                break;
            case "TestSession.Message":
                this._onDidTestSessionMessageReceived.fire(<VSTestProtocol.MessageResult>message.Payload);
                break;
            case "TestExecution.CustomTestHostLaunch":
                this._onDidTestHostLaunched.fire(<VSTestProtocol.TestRunnerProcessStartInfoResponse>message);
            default:
                console.log(message);
        }
    }

    public findFreePort(): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            freeport(function (err, port) {
                if (err) {
                    reject(err);
                }
                resolve(port);
            });
        });
    }

    /**
     * Initialize the Test Session
     */
    
    public async initialize(workspace, additionalAdapters?: Array<string>): Promise<void> {
        let portNumber = await this.findFreePort();
        const lib = "vstest";
        // FIXME: on Windows `--` likely will not work and needs to be `/`
        const processId = `--parentprocessid:${process.pid}`;
        const port = `--port:${portNumber}`;
        const diag = "";//`/Diag:C:\\Users\\gfrancischini\\Downloads\\Logs\\Log.txt`;
        return new Promise<void>((resolve, reject) => {
            this.launchServer({ command: "dotnet", args: [lib, processId, port] }, portNumber, workspace).then(() => {
                this.onDidTestSessionConnected(() => {
                    this.initializeExtensions(additionalAdapters);
                    this.versionRequest();
                    setTimeout(function () {
                        resolve();
                    }, 5000);
                });
            });
        });
    }

    /**
     * Send a initialize extensions request to the test host
     */
    public initializeExtensions(additionalAdapters?: Array<string>) {
        var initializeExtensionsRequest: VSTestProtocol.InitializeExtensionsRequest = {
            MessageType: "Extensions.Initialize",
            Version: 1,
            Payload: new Array<string>()
        };

        //initializeExtensionsRequest.Payload.push("C:\\Users\\gfrancischini\\source\\repos\\vscodecsharp\\bin\\Debug\\net46\\Microsoft.VisualStudio.TestPlatform.MSTest.TestAdapter.dll");
        //initializeExtensionsRequest.Payload.push("C:\\Program Files (x86)\\Microsoft Visual Studio 14.0\\Common7\\IDE\\Extensions\\Microsoft\Node.js Tools for Visual Studio\\1.3\\Microsoft.NodejsTools.TestAdapter.dll");

        if (additionalAdapters) {
            additionalAdapters.forEach((adatper: string) => {
                initializeExtensionsRequest.Payload.push(adatper);
            });
        }

        this.sendProtocolMessage(initializeExtensionsRequest);
    }

    /**
     * Run a set of tests
     * @param sources 
     * @param tests 
     * @param debuggingEnabled 
     */
    public runTests(sources: Array<String>, tests: Array<VSTestProtocol.TestCase>, runSettings: string, debuggingEnabled: boolean) {
        const runTestsRequest: VSTestProtocol.RunTestsRequest = {
            MessageType: "TestExecution.RunAllWithDefaultHost",
            Payload: {
                Sources: null,
                TestCases: tests,
                RunSettings: runSettings,
                KeepAlive: false,
                DebuggingEnabled: debuggingEnabled
            }
        }
        this.sendProtocolMessage(runTestsRequest);
    }


    /**
     * Discovery the test on the underline sources
     * @param sources 
     */
    public discoveryTests(sources: Array<string>, runSettings: string) {
        const message = sources.reduce((previous, current) => {
            return `${previous}${current}\r\n`;
        }, "Test Runner will submit the following test files to discovery:\r\n")

        this._onDidTestSessionMessageReceived.fire({
            Message: message,
            MessageLevel: 0
        });

        var discoveryRequest: VSTestProtocol.StartDiscoveryRequest = {
            MessageType: "TestDiscovery.Start",
            Payload: {
                Sources: sources,
                RunSettings: runSettings
            }
        }
        this.sendProtocolMessage(discoveryRequest);
    }

    /**
     * Send a initialize extensions request to the test host
     */
    public versionRequest() {
        var versionRequest: VSTestProtocol.VersionRequest = {
            MessageType: "ProtocolVersion",
            Payload: 1
        };

        this.sendProtocolMessage(versionRequest);
    }

    protected onEvent({ event, message }) {
        switch (event) {
            case "exit":
                this._onDidTestSessionMessageReceived.fire({ Message: message, MessageLevel: 0 });
                break;
            default:
                this._onDidTestSessionMessageReceived.fire({ Message: message, MessageLevel: 0 });
                break;
        }
    }

    /**
     * Run a set of tests
     * @param sources 
     * @param tests 
     * @param debuggingEnabled 
     */
    public debugTests(sources: Array<String>, tests: Array<VSTestProtocol.TestCase>, runSettings: string, debuggingEnabled: boolean) {
        const runTestsRequest: VSTestProtocol.TestRunnerProcessStartInfoRequest = {
            MessageType: "TestExecution.GetTestRunnerProcessStartInfoForRunAll",
            Payload: {
                Sources: null,
                TestCases: tests,
                RunSettings: runSettings,
                KeepAlive: false,
                DebuggingEnabled: debuggingEnabled
            }
        }
        this.sendProtocolMessage(runTestsRequest);
    }

}

