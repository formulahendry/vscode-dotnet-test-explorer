"use strict";
import { TextDocumentContentProvider, Uri, EventEmitter } from 'vscode';

export class TestResultDocumentContentProvider implements TextDocumentContentProvider {
    onDidChangeEmitter = new EventEmitter<Uri>();
    onDidChange = this.onDidChangeEmitter.event;

    provideTextDocumentContent(uri: Uri): string {
        return `
Test Name: ${uri.path}
Test Outcome: ${uri.fragment}
Standard Output:
${uri.query}
`;
    }
}