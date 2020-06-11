import * as netUtil from "./netUtil";
import * as vscode from "vscode";
import { Logger } from "./logger";
import { ITestResult } from "./testResult";

export interface IDiscoveryMessage {
    type: "discovery",
    discovered: string[]
}
export interface IResultMessage extends ITestResult {
    type: "result"
}

type EmptyMessage<T extends string> = { type: T }

export type LoggerMessage =
    IDiscoveryMessage
    | IResultMessage
    | EmptyMessage<"testRunStarted">
    | EmptyMessage<"testRunComplete">;

export class TestResultsListener implements vscode.Disposable {
    private _onMessage: vscode.EventEmitter<LoggerMessage> = new vscode.EventEmitter<LoggerMessage>();
    public onMessage = this._onMessage.event;

    private server: netUtil.ILocalServer;
    public get port() { return this.server.port; }
    private constructor() { }
    public static async create(): Promise<TestResultsListener> {
        const result = new TestResultsListener();
        result.server = await netUtil.createLocalTcpServer(async (socket) => {
            const data = await netUtil.readAllFromSocket(socket);
            socket.end();

            Logger.Log(`Received message: ${data}`);
            const parsed = JSON.parse(data) as LoggerMessage;
            result._onMessage.fire(parsed);
        })
        Logger.Log(`Opened TCP server on port ${result.server.port}`);
        return result;
    }

    dispose() {
        netUtil.shutdown(this.server);
    }
}
