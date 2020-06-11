"use strict";
import { CodeLens, Range } from "vscode";
import { Utility } from "./utility";
import { Outcome } from "./testResult";

export class TestStatusCodeLens extends CodeLens {
    public static parseOutcome(outcome: Outcome): string {
        if (outcome === "Passed") {
            return Utility.codeLensPassed;
        } else if (outcome === "Failed") {
            return Utility.codeLensFailed;
        } else if (outcome === "Skipped") {
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
