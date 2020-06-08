import * as assert from "assert";
import * as sinon from "sinon";
import { window, WorkspaceConfiguration } from "vscode";
import { IMessage, MessagesController } from "../src/messages";

suite("MessagesController - Show warning message", () => {
    // Typescript does not know (and can't be told) which overload of window.showWarningMessage
    // we want to stub, so we'll just cast the arguments to any.
    const showWarningMessageStub: sinon.SinonStub = sinon.stub(window, "showWarningMessage");
    const getSectionStub = sinon.stub();
    const updateSectionStub = sinon.stub();

    const globalState = {
        get: getSectionStub,
        update: updateSectionStub,
    };

    const suppressedMessagesStateKey = "suppressedMessages";
    const suppressMessageItem = "Don't show again";

    let suppressedMessages: string[];
    let message: IMessage;
    let messagesController: MessagesController;

    setup(() => {
        messagesController = new MessagesController(globalState);

        message = {
            text: "messageText",
            type: "messageType",
        };

        suppressedMessages = [];

        getSectionStub.returns(suppressedMessages);
        showWarningMessageStub.resolves();
        updateSectionStub.resolves();
    });

    teardown(() => {
        showWarningMessageStub.reset();
        getSectionStub.reset();
        updateSectionStub.reset();
    });

    test("Shows warning message when not suppressed by the user", () => {
        messagesController.showWarningMessage(message);

        assert(
            showWarningMessageStub.calledOnceWith(message.text, suppressMessageItem),
            "Message is not shown.");
    });

    test("Shows warning message when other message type is suppressed", () => {
        suppressedMessages.push("foo");

        messagesController.showWarningMessage(message);

        assert(
            showWarningMessageStub.calledOnceWith(message.text, suppressMessageItem),
            "Message is not shown.");
    });

    test("Does not show warning message when is suppressed by the user", () => {
        suppressedMessages.push(message.type);

        messagesController.showWarningMessage(message);

        assert(showWarningMessageStub.notCalled, "Suppressed message is shown.");
    });

    test("Adds message type to suppressed messages when suppressMessage action is invoked", () => {
        showWarningMessageStub.resolves(suppressMessageItem);

        return messagesController.showWarningMessage(message).then(() => {
            assert(updateSectionStub.calledOnceWith(
                suppressedMessagesStateKey,
                sinon.match.array.contains([message.type])),
                "Message type not added to suppressedMessages state collection");
        });
    });

    test("Keeps existing suppressed messages types when suppressMessage action is invoked", () => {
        const existingSuppressedMessageType = "existing";
        suppressedMessages.push(existingSuppressedMessageType);

        showWarningMessageStub.resolves(suppressMessageItem);

        return messagesController.showWarningMessage(message).then(() => {
            assert(updateSectionStub.calledOnceWith(
                suppressedMessagesStateKey,
                sinon.match.array.contains([existingSuppressedMessageType])),
                "Message type not added to suppressedMessages state collection");
        });
    });

    test("Does not duplicate suppressMessage types when suppressMessage action is invoked", () => {
        showWarningMessageStub.resolves(suppressMessageItem);

        getSectionStub.onSecondCall().returns([message.type]);

        return messagesController.showWarningMessage(message).then(() => {
            assert(updateSectionStub.notCalled,
                "SuppressedMessages configuration setting value was updated.");
        });
    });
});
