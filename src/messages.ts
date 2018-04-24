import * as vscode from "vscode";
import { Logger } from "./logger";

const suppressedMessagesStateKey = "suppressedMessages";
const suppressMessageItem = "Don't show again";

export interface IMessage {
    text: string;
    type: string;
}

export interface IMessagesController {
    showWarningMessage(message: IMessage);
}

export class MessagesController implements IMessagesController {
    constructor(private globalState: vscode.Memento) { }

    /**
     * @description
     * Displays the warning message that can be suppressed by the user.
     */
    public showWarningMessage(message: IMessage) {
        if (this.isSuppressed(message.type)) {
            return;
        }

        return vscode.window.showWarningMessage(message.text, suppressMessageItem)
            .then((item) => {
                if (item === suppressMessageItem) {
                    this.setSuppressed(message.type);
                }
            });
    }

    private isSuppressed(messageType: string) {
        const suppressedMessages = this.globalState.get<string[]>(suppressedMessagesStateKey);
        return suppressedMessages && suppressedMessages.indexOf(messageType) > -1;
    }

    private setSuppressed(messageType: string) {
        const suppressedMessages =
            this.globalState.get<string[]>(suppressedMessagesStateKey) || [];

        if (suppressedMessages.indexOf(messageType) === -1) {
            suppressedMessages.push(messageType);

            this.globalState.update(suppressedMessagesStateKey, suppressedMessages)
                .then(() => { }, (reason) => {
                    Logger.LogError("Error while updating global state value", reason);
                });
        }
    }
}
