"use strict";
import * as fs from "fs";
import * as glob from "glob";
import { Disposable } from "vscode";
import { AppInsightsClient } from "./appInsightsClient";
import { Logger } from "./logger";
import { TestCommands } from "./testCommands";
import { TestDirectories } from "./testDirectories";
import { IDiscoverTestsResult } from "./testDiscovery";

export class AppInsights {

    private testDiscoveryFinishedEvent: Disposable;

    constructor(
        private testCommands: TestCommands,
        private testDirectories: TestDirectories) {
            if (AppInsightsClient.EnableTelemetry) {
                this.testDiscoveryFinishedEvent = this.testCommands.onTestDiscoveryFinished(this.telemetryDiscoveredTests, this);
            }
        }

    private telemetryDiscoveredTests(results: IDiscoverTestsResult[]) {

        // Dispose to unsubscribe, we only try to report these metrics first time tests are discovered
        this.testDiscoveryFinishedEvent.dispose();

        const numberOfTests = [].concat(...results.map( (r) => r.testNames)).length;
        const testDirectories = this.testDirectories.getTestDirectories();

        // Only look for the test framework in the first test direcoty. If users are using multiple test frameworks we don't care too much.
        const firstTestDirectory = testDirectories[0];

        glob(firstTestDirectory + "**/+(*.csproj|*.fsproj)", {}, (errorReadDirectory, files) => {
            if (!errorReadDirectory) {

                fs.readFile(files[0], (errorReadFile, data) => {
                    if (!errorReadFile) {

                        try {
                            const projContent = data.toString().toLowerCase();
                            let testFramework = "unknown";

                            if (projContent.includes("nunit")) {
                                testFramework = "nunit";
                            } else if (projContent.includes("xunit")) {
                                testFramework = "xunit";
                            } else if (projContent.includes("mstest.testframework")) {
                                testFramework = "mstest";
                            }

                            Logger.Log(`Discoverd tests with ${testFramework}. Found ${numberOfTests} in ${testDirectories.length} directories`);
                            AppInsightsClient.sendEvent("Discoverd tests", {"Test framework": testFramework}, {Tests: numberOfTests, Directories: testDirectories.length} );
                        } catch (err) {
                            Logger.LogError("Failed to send telemetry for discovered tests", err);
                        }
                    }
                });
            }
        });
    }
}
