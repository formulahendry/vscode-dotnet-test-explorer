"use strict";
import appInsights = require("applicationinsights");
import * as fs from "fs";
import * as glob from "glob";
import { AppInsightsClient } from "./appInsightsClient";
import { TestCommands } from "./testCommands";
import { TestDirectories } from "./testDirectories";
import { IDiscoverTestsResult } from "./testDiscovery";
import { Utility } from "./utility";

export class AppInsights {

    constructor(
        private testCommands: TestCommands,
        private testDirectories: TestDirectories) {
            if (AppInsightsClient.EnableTelemetry) {
                this.testCommands.onNewTestDiscovery(this.telemetryDiscoveredTests, this);
            }
        }

    private telemetryDiscoveredTests(results: IDiscoverTestsResult[]) {
        const numberOfTests = [].concat(...results.map( (r) => r.testNames)).length;

        const firstTestDirectory = this.testDirectories.getTestDirectories()[0];

        glob(firstTestDirectory + "+(*.csproj|*.fsproj)", {}, (errorReadDirectory, files) => {
            fs.readFile(files[0], (errorReadFile, data) => {
                if (!errorReadFile) {
                    console.log(data.toString());
                }
            });
        });

        const z = 1;
        // this.statusBar.discovered(this.discoveredTests.length);
        // this._onDidChangeTreeData.fire();
    }
}
