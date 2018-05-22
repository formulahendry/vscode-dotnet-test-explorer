import * as vscode from "vscode";
import { TestModel, Test } from "../../vsTest/vsTestModel";
import { VSTestSession } from "../../vsTest/vsTestSession";
import Event, { Emitter } from "../../vsTest/base/common/Event";
import { VSTestService } from "../../vsTest/vsTestService";
import { getConfigurationForAdatper, getCurrentAdapterName } from "../config";
export class VSTestServiceIDE extends VSTestService {

    constructor(workspace : string) {
        super(workspace, getCurrentAdapterName(),getConfigurationForAdatper());
    }

    /**
     * Discover the files in the given directory
     * @param directory The directory path do discvery the tests
     */
    public discoveryTests(directory: string) {
        return <Promise<VSTestProtocol.TestDiscoveryResult>>vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: "Test Adapter" }, progress => {
            progress.report({ message: "Discovering Tests" });
            return new Promise((resolve, reject) => {
                super.discoveryTests(directory).then((result) => {
                    resolve(result);
                }).catch((error) => {
                    reject(null);
                });
            });
        });
    }

    /**
     * Run a set of tests 
     * @param tests The set of test to run
     * @param debuggingEnabled 
     */
    public runTests(tests: Array<Test>, debuggingEnabled: boolean = false) {
        return <Promise<any>>vscode.window.withProgress({ location: vscode.ProgressLocation.Window, title: "Test Adapter" }, progress => {
            progress.report({ message: "Running Tests" });
            return new Promise((resolve, reject) => {
                super.runTests(tests, debuggingEnabled).then((result) => {
                    resolve();
                }).catch((error) => {
                    reject();
                });
            });
        });
    }
}