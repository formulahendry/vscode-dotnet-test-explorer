import * as assert from "assert";
import * as sinon from "sinon";
import { window, WorkspaceConfiguration } from "vscode";
import { IMessage, showWarningMessage } from "../src/messages";
import { Utility } from "../src/utility";

suite("Messages - Show warning message", () => {
    const getConfigurationStub = sinon.stub(Utility, "getConfiguration");
    const showWarningMessageStub = sinon.stub(window, "showWarningMessage");
    const getSectionStub = sinon.stub();
    const updateSectionStub = sinon.stub();

    const configuration = {
        get: getSectionStub,
        update: updateSectionStub,
    };

    const suppressedMessagesConfigurationKey = "suppressedMessages";
    const suppressMessageItem = "Don't show again";

    let suppressedMessages: string[];
    let message: IMessage;

    setup(() => {
        message = {
            text: "messageText",
            type: "messageType",
        };

        suppressedMessages = [];

        getConfigurationStub.returns(configuration);
        getSectionStub.returns(suppressedMessages);
        showWarningMessageStub.resolves();
        updateSectionStub.resolves();
    });

    teardown(() => {
        getConfigurationStub.reset();
        showWarningMessageStub.reset();
        getSectionStub.reset();
        updateSectionStub.reset();
    });

    test("Shows warning message when not suppressed by the user", () => {
        showWarningMessage(message);

        assert(
            showWarningMessageStub.calledOnceWith(message.text, suppressMessageItem),
            "Message is not shown.");
    });

    test("Shows warning message when other message type is suppressed", () => {
        suppressedMessages.push("foo");

        showWarningMessage(message);

        assert(
            showWarningMessageStub.calledOnceWith(message.text, suppressMessageItem),
            "Message is not shown.");
    });

    test("Does not show warning message when is suppressed by the user", () => {
        suppressedMessages.push(message.type);

        showWarningMessage(message);

        assert(showWarningMessageStub.notCalled, "Suppressed message is shown.");
    });

    test("Adds message type to suppressed messages when suppressMessage action is invoked", () => {
        showWarningMessageStub.resolves(suppressMessageItem);

        return showWarningMessage(message).then(() => {
            assert(updateSectionStub.calledOnceWith(
                suppressedMessagesConfigurationKey,
                sinon.match.array.contains([message.type]),
                true),
                "Message type not added to suppressedMessages configuration setting collection");
        });
    });

    test("Keeps existing suppressed messages types when suppressMessage action is invoked", () => {
        const existingSuppressedMessageType = "existing";
        suppressedMessages.push(existingSuppressedMessageType);

        showWarningMessageStub.resolves(suppressMessageItem);

        return showWarningMessage(message).then(() => {
            assert(updateSectionStub.calledOnceWith(
                suppressedMessagesConfigurationKey,
                sinon.match.array.contains([existingSuppressedMessageType]),
                true),
                "Message type not added to suppressedMessages configuration setting collection");
        });
    });

    test("Does not duplicate suppressMessage types when suppressMessage action is invoked", () => {
        showWarningMessageStub.resolves(suppressMessageItem);

        getSectionStub.onSecondCall().returns([message.type]);

        return showWarningMessage(message).then(() => {
            assert(updateSectionStub.notCalled,
                "SuppressedMessages configuration setting value was updated.");
        });
    });
});
