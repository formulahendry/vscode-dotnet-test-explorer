import * as fs from "fs";
import * as glob from "glob";
import * as vscode from "vscode";
import { Logger } from "./logger";
import { Utility } from "./utility";

export class TestDirectories {

    private directories: string[];
    private testsForDirectory: Array<{ dir: string, name: string }>;

    public parseTestDirectories() {
        const testDirectoryGlob = Utility.getConfiguration().get<string>("testProjectPath");
        this.directories = [];

        const globPattern = vscode.workspace.rootPath.replace("\\", "/") + "/" + testDirectoryGlob;

        Logger.Log(`Finding projects for pattern ${globPattern}`);

        const matchingDirs = glob.sync(globPattern);

        Logger.Log(`Found ${matchingDirs.length} matches for pattern`);

        matchingDirs.forEach( (dir) => {
            Logger.Log(`Evaluating match ${dir}`);
            this.evaluateTestDirectory(dir);
        });
    }

    public addTestsForDirectory(testsForDirectory) {
        this.testsForDirectory = this.testsForDirectory.concat(testsForDirectory);
    }

    public clearTestsForDirectory() {
        this.testsForDirectory = [];
    }

    public getTestDirectories(testName?: string): string[] {

        if (testName && testName !== "") {
            const dirForTestName = this
                .testsForDirectory
                .filter( (t) => t.name.startsWith(testName))
                .map( (t) => t.dir);

            return [...new Set(dirForTestName)];
        }

        return this.directories;
    }

    private evaluateTestDirectory(testProjectFullPath: string): void {

        if (!fs.existsSync(testProjectFullPath)) {
            Logger.LogWarning(`Path ${testProjectFullPath} is not valid`);
        } else {
            Logger.Log(`Adding directory ${testProjectFullPath}`);
            this.directories.push(testProjectFullPath);
        }
    }
}
