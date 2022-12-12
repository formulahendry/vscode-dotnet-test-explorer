import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import * as vscode from "vscode";
import { Logger } from "./logger";
import { Utility } from "./utility";

export class TestDirectories {

    private directories: string[];
    private testsForDirectory: { dir: string, name: string }[];

    public parseTestDirectories() {

        if (!vscode.workspace || !vscode.workspace.workspaceFolders) {
            return;
        }

        const testProjectsConfiguration = Utility.getConfiguration().get("testProjectPath");
        const testProjectsArray = [].concat(testProjectsConfiguration);

        const matchingDirs = [];

        vscode.workspace.workspaceFolders.forEach((folder) => {

            testProjectsArray.forEach(testProjectGlob => {
                const globPattern = folder.uri.fsPath.replace("\\", "/") + "/" + testProjectGlob;

                Logger.Log(`Finding projects for pattern ${globPattern}`);

                const matchingDirsForWorkspaceFolder = glob.sync(globPattern);

                matchingDirs.push(...matchingDirsForWorkspaceFolder);

                Logger.Log(`Found ${matchingDirsForWorkspaceFolder.length} matches for pattern in folder ${folder.uri.fsPath}`);
            })
        });

        this.directories = evaluateTestDirectories(matchingDirs);
    }

    public addTestsForDirectory(testsForDirectory) {
        this.testsForDirectory = this.testsForDirectory.concat(testsForDirectory);
    }

    public clearTestsForDirectory() {
        this.testsForDirectory = [];
    }

    public getFirstTestForDirectory(directory: string): string {
        return this
            .testsForDirectory
            .find((t) => t.dir === directory).name;
    }

    public getTestDirectories(testName?: string): string[] {

        if (testName && testName !== "") {
            const dirForTestName = this
                .testsForDirectory
                .filter((t) => t.name.startsWith(testName))
                .map((t) => t.dir);

            return [...new Set(dirForTestName)];
        }

        return this.directories;
    }

}
function evaluateTestDirectories(testDirectories: string[]): string[] {
    const projectPaths = [];
    const projectPathsSet = new Set<string>();

    for (let testProjectFullPath of testDirectories) {
        Logger.Log(`Evaluating match ${testProjectFullPath}`);

        if (!fs.existsSync(testProjectFullPath)) {
            Logger.LogWarning(`Path ${testProjectFullPath} is not valid`);
        } else {
            if (fs.lstatSync(testProjectFullPath).isDirectory() && glob.sync(`${testProjectFullPath}/+(*.csproj|*.sln|*.slnf|*.fsproj)`).length < 1) {
                Logger.LogWarning(`Skipping path ${testProjectFullPath} since it does not contain something we can build (.sln, .slnf, .csproj, .fsproj)`);
            } else if (!projectPathsSet.has(testProjectFullPath)) {
                Logger.Log(`Adding directory ${testProjectFullPath}`);
                projectPaths.push(testProjectFullPath);
                projectPathsSet.add(testProjectFullPath);
            }
        }
    }
    return projectPaths;
}
