import * as vscode from "vscode";

export class TestOutputChannel {
    private outputChannel = vscode.window.createOutputChannel('vsTest');

    public appendData(value : string) {
        this.outputChannel.appendLine(value);
    }
}