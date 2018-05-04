// at cas.normalizer.rccl.FileToObject.FileToObject.GetItineraryFileData(IEnumerable`1 rawDataRows) in D:\dev\cas-normalizer-rccl\cas-normalizer-rccl\FileToObject\FileToObject.cs:line 19
// at cas.normalizer.rccl.tests.NormalizerTests.Brands() in D:\dev\cas-normalizer-rccl\cas-normalizer-rccl-tests\NormalizerTests.cs:line 173

import * as path from "path";
import * as vscode from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { TestNode } from "./testNode";
import { TestResult } from "./testResult";
import { TestResultsFile } from "./testResultsFile";

export class Problems {

    constructor(private resultsFile: TestResultsFile) {
        resultsFile.onNewResults(this.addTestResults, this);
    }

    public createProblemsFromResults(results: TestResult[]) {
        const resultsWithStackTrace = results
            .filter( (tr) => tr.stackTrace)
            .map( (tr) => tr.stackTrace);

        //const m = resultsWithStackTrace[0].match(/in (.*):line (.*)/m);

        const regex = /in (.*):line (.*)/gm;

        let m = regex.exec(resultsWithStackTrace[0]);
        
        const result = [];

        while (m !== null) {
            // This is necessary to avoid infinite loops with zero-width matches
            if (m.index === regex.lastIndex) {
                regex.lastIndex++;
            }

            result.push({file: m[1], lineNumber: m[2]} );

            // The result can be accessed through the `m`-variable.
            // m.forEach((match, groupIndex) => {
                
            //     //console.log(`Found match, group ${groupIndex}: ${match}`);
            // });

            m = regex.exec(resultsWithStackTrace[0]);
        }

        console.log(result);
    }

    private addTestResults(results: TestResult[]) {
        this.createProblemsFromResults(results);
    }
}
