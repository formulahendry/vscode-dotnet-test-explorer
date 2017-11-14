"use strict";
import { CodeLens, Range } from "vscode";

export class TestStatusCodeLens extends CodeLens {
    public static parseOutcome(outcome: string): string {
        if (outcome === "Passed") {
            return "✔️";
        } else if (outcome === "Failed") {
            return "❌";
        } else if (outcome === "NotExecuted") {
            return "️️⚠️";
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
