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
    public async showWarningMessage(message: IMessage) {
        if (this.isSuppressed(message.type)) {
            return;
        }

        const item = await vscode.window.showWarningMessage(message.text, suppressMessageItem);
        if (item === suppressMessageItem) {
            this.setSuppressed(message.type);
        }
    }

    private isSuppressed(messageType: string) {
        const suppressedMessages = this.globalState.get<string[]>(suppressedMessagesStateKey);
        return suppressedMessages && suppressedMessages.indexOf(messageType) > -1;
    }

    private async setSuppressed(messageType: string) {
        const suppressedMessages =
            this.globalState.get<string[]>(suppressedMessagesStateKey) || [];

        if (suppressedMessages.indexOf(messageType) === -1) {
            suppressedMessages.push(messageType);

            try {
                await this.globalState.update(suppressedMessagesStateKey, suppressedMessages)
            }
            catch (error) {
                Logger.LogError("Error while updating global state value", error);
            }
        }
    }
}
