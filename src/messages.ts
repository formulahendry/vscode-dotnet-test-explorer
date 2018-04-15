import * as vscode from "vscode";
import { Logger } from "./logger";
import { Utility } from "./utility";

const suppressedMessagesConfigurationKey = "suppressedMessages";
const suppressMessageItem = "Don't show again";

export interface IMessage {
    text: string;
    type: string;
}

export function showWarningMessage(message: IMessage) {
    const configuration = Utility.getConfiguration();

    if (isSuppressed(message.type, configuration)) {
        return;
    }

    return vscode.window.showWarningMessage(message.text, suppressMessageItem)
        .then((item) => {
            if (item === suppressMessageItem) {
                setSuppressed(message.type, configuration);
            }
        });
}

function isSuppressed(messageType: string, configuration: vscode.WorkspaceConfiguration) {
    const suppressedMessages = configuration.get<string[]>(suppressedMessagesConfigurationKey);
    return suppressedMessages && suppressedMessages.indexOf(messageType) > -1;
}

function setSuppressed(messageType: string, configuration: vscode.WorkspaceConfiguration) {
    const suppressedMessages =
        configuration.get<string[]>(suppressedMessagesConfigurationKey) || [];

    if (suppressedMessages.indexOf(messageType) === -1) {
        suppressedMessages.push(messageType);

        configuration.update(suppressedMessagesConfigurationKey, suppressedMessages, true)
            .then(() => {}, (reason) => {
                Logger.LogError("Error while updating configuration settings", reason);
            });
    }
}
