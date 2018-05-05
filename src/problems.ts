import * as path from "path";
import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { TestNode } from "./testNode";
import { TestResult } from "./testResult";
import { TestResultsFile } from "./testResultsFile";
import { Utility } from "./utility";

export class Problems {

    public static createProblemsFromResults(results: TestResult[]) {
        const resultsWithStackTrace = results
            .filter( (tr) => tr.stackTrace);

        if (!resultsWithStackTrace.length) {
            return [];
        }

        const problems = [];

        resultsWithStackTrace.forEach( (testResult) => {

            let m = Problems.regex.exec(testResult.stackTrace);

            const resultsWithLinks = [];

            while (m !== null) {
                if (m.index === Problems.regex.lastIndex) {
                    Problems.regex.lastIndex++;
                }

                resultsWithLinks.push({uri: m[1], lineNumber: parseInt(m[2], 10), message: testResult.message});
                m = Problems.regex.exec(testResult.stackTrace);
            }

            problems.push(resultsWithLinks[resultsWithLinks.length - 1]);
        });

        return problems.reduce( (groups, item) => {
            const val = item.uri;
            groups[val] = groups[val] || [];
            groups[val].push(new vscode.Diagnostic(new vscode.Range(item.lineNumber - 1, 0, item.lineNumber - 1, 100), item.message));
            return groups;
          }, {});
    }

    private static regex = /in (.*):line (.*)/gm;
    private _diagnosticCollection: vscode.DiagnosticCollection;

    constructor(private resultsFile: TestResultsFile) {
        if (Utility.getConfiguration().get<boolean>("addProblems")) {
            resultsFile.onNewResults(this.addTestResults, this);
            this._diagnosticCollection = vscode.languages.createDiagnosticCollection("dotnet-test-explorer");
        }
    }

    public dispose() {
        if (this._diagnosticCollection) {
            this._diagnosticCollection.dispose();
        }
    }

    private addTestResults(results: TestResult[]) {

        this._diagnosticCollection.clear();

        const problems = Problems.createProblemsFromResults(results);

        const newDiagnostics: Array<[vscode.Uri, vscode.Diagnostic[]]> = [];

        for (const problem in problems) {
            if (problems.hasOwnProperty(problem)) {
                newDiagnostics.push([vscode.Uri.file(problem), problems[problem]]);
            }
        }

        this._diagnosticCollection.set(newDiagnostics);
    }
}
