import * as vscode from "vscode";
import { Utility } from "./utility";

export interface IDebugRunnerInfo {
    config?: vscode.DebugConfiguration;
    isSettingUp: boolean;
    isRunning: boolean;
    waitingForAttach: boolean;
    processId: string;
}

export class Debug {
    private processIdRegexp = new RegExp(Utility.testhostProcessIdPattern, 'mi');
    private debuggingEnabledRegexp = new RegExp(Utility.testhostStartedPattern, 'mi');

    public onData(data: string, debugRunnerInfo?: IDebugRunnerInfo): IDebugRunnerInfo  {

        if (!debugRunnerInfo) {
            debugRunnerInfo = {isRunning: false, isSettingUp: true, waitingForAttach: false, processId: ""};
        }

        if (!debugRunnerInfo.waitingForAttach && this.debuggingEnabledRegexp.test(data)) {
            debugRunnerInfo.waitingForAttach = true;
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
