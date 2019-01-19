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

/** 
 * See spec for details: https://github.com/Microsoft/vstest-docs/blob/master/RFCs/0007-Editors-API-Specification.md
 **/
declare module VSTestProtocol {
    export interface ProtocolMessage {
        MessageType: string;
        Payload: any;
    }

    export interface Request extends ProtocolMessage {

    }

    export interface Response extends ProtocolMessage {

    }

    export interface StartDiscoveryRequest extends Request {
        // messageType = TestDiscovery.Start
        Payload: {
            Sources: Array<String>;
            RunSettings: string;
        }
    }

    export interface TestFoundResponse extends Response {
        // messageType = TestDiscovery.TestFound
        Payload: Array<TestCase>;
    }

    export interface Property {
        Key: {
            Id: string,
            Label: string,
            Category: string,
            Description: string,
            Attributes: string,
            ValueType: string,
        },
        Value: Object,
    }

    export interface TestCase {
        Properties: Array<Property>
    }

    export interface TestDiscoveryResult {
        TotalTests: number,
        IsAborted: boolean,
        LastDiscoveredTests: Array<TestCase>
    }

    export interface TestDiscoveryCompletedResponse extends Response {
        // messageType = TestDiscovery.Completed
        Payload: TestDiscoveryResult;
    }

    export interface RunTestsRequest extends Request {
        // messageType = TestExecution.RunAllWithDefaultHost
        Payload: {
            Sources: Array<String>,
            TestCases: Array<TestCase>,
            RunSettings: string,
            KeepAlive: boolean,
            DebuggingEnabled: boolean
        }
    }

    export interface TestResult {
        TestCase: TestCase,
        Attachments: Array<String>,
        Messages: Array<string>,
        Properties: Array<Property>
    }

    export interface TestRunStatistics {
        ExecutedTests,
        Stats
    }

    export interface TestRunStatisticsResult {
        NewTestResults: Array<TestResult>,
        ActiveTests: Array<TestCase>,
        TestRunStatistics: TestRunStatistics
    }

    export interface TestRunStatisticsResponse extends Request {
        // messageType = TestExecution.StatsChange
        Payload: TestRunStatisticsResult,
    }


    export interface TestRunCompleteResult {
        TestRunCompleteArgs: {
            TestRunStatistics: TestRunStatistics,
            IsCanceled: boolean,
            IsAborted: boolean,
            Error: string,
            AttachmentSets: Array<any>,
            ElapsedTimeInRunningTests: string
        }
        LastRunTests: TestRunStatisticsResult,
        RunAttachments: Array<any>,
        ExecutorUris: Array<any>,
    }


    export interface TestRunCompleteResponse extends Request {
        // messageType = TestExecution.Completed
        Payload: TestRunCompleteResult,
    }

    export interface MessageResult {
        Message: string,
        MessageLevel: number,
    }

    export interface MessageResponse extends Request {
        // messageType = TestSession.Message
        Payload: MessageResult,
    }


    export interface InitializeExtensionsRequest extends Request {
        // messageType = Extensions.Initialize
        Version: number
        /**
         * List of paths of extensions
         */
        Payload: Array<string>,
    }

    export interface VersionRequest extends Request {
        //"MessageType": "ProtocolVersion",
        Payload: number
    }

    export interface VersionResponse extends Response {
        //"MessageType": "ProtocolVersion",
        Payload: number,
    }


    export interface TestRunnerProcessStartInfoRequest extends Request {
        // messageType = TestSession.GetTestRunnerProcessStartInfoForRunAll
        Payload: {
            Sources: Array<String>,
            TestCases: Array<TestCase>,
            RunSettings: string,
            KeepAlive: boolean,
            DebuggingEnabled: boolean
        }
    }

    export interface TestRunnerProcessStartInfoResponse extends Response {
        // message type = TestExecution.CustomTestHostLaunch
        Payload: {
            /**
             * 	Name of the host process
             */
            FileName: string,
            /**
             * Arguments to be passed to the host process
             */
            Arguments: string,
            /**
             * Working directory for the host process
             */
            WorkingDirectory: string,
            /**
             * Environment variables associated with host process
             */
            EnvironmentVariables: Array<any>,
            /**
             * Any custom properties that need to set
             */
            CustomProperties: Array<any>
        }
    }
}
