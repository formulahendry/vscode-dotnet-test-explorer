"use strict";
import { CodeLens, Range } from "vscode";
import { Utility } from "./utility";

export class TestStatusCodeLens extends CodeLens {
    public static parseOutcome(outcome: string): string {
        if (outcome === "Passed") {
            return Utility.codeLensPassed;
        } else if (outcome === "Failed") {
            return Utility.codeLensFailed;
        } else if (outcome === "NotExecuted") {
            return Utility.codeLensSkipped;
        } else {
            return null;
        }
    }

    public constructor(range: Range, status: string) {
        super(range);

        this.command = {
            title: status,
            command: null,
        };
    }
}
