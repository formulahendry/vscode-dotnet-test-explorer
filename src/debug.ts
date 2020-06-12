import * as vscode from "vscode";

export interface IDebugRunnerInfo {
    config?: vscode.DebugConfiguration;
    isSettingUp: boolean;
    isRunning: boolean;
    waitingForAttach: boolean;
    processId: string;
}

export class Debug {
    private processIdRegexp = /Process Id: (.*),/gm;

    public onData(data: string, debugRunnerInfo?: IDebugRunnerInfo): IDebugRunnerInfo  {

        if (!debugRunnerInfo) {
            debugRunnerInfo = {isRunning: false, isSettingUp: true, waitingForAttach: false, processId: ""};
        }

        if (!debugRunnerInfo.waitingForAttach) {
            debugRunnerInfo.waitingForAttach = data.indexOf("Waiting for debugger attach...") > -1;
        }

        if (debugRunnerInfo.processId.length <= 0) {
            const match = this.processIdRegexp.exec(data);

            if (match && match[1]) {
                debugRunnerInfo.processId = match[1];
            }
        }

        if (debugRunnerInfo.waitingForAttach && debugRunnerInfo.processId.length > 0) {
            debugRunnerInfo.config = {
                name: "NET TestExplorer Core Attach",
                type: "coreclr",
                request: "attach",
                processId: debugRunnerInfo.processId,
            };
        }

        return debugRunnerInfo;
    }
}
