"use strict";
import { parse } from "dotenv";
import * as fs from "fs";
import { platform, tmpdir } from "os";
import * as path from "path";
import * as vscode from "vscode";
import { Logger } from "./logger";

export class Utility {

    public static skipBuild: boolean;
    public static runInParallel: boolean;

    public static get codeLensEnabled(): boolean {
        return Utility.showCodeLens;
    }

    public static get codeLensFailed(): string {
        return Utility.failed;
    }

    public static get codeLensPassed(): string {
        return Utility.passed;
    }

    public static get codeLensSkipped(): string {
        return Utility.skipped;
    }

    public static get defaultCollapsibleState(): vscode.TreeItemCollapsibleState {
        return Utility.autoExpandTree ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed;
    }

    public static get pathForResultFile(): string {
        const pathForResultFile = Utility.getConfiguration().get<string>("pathForResultFile");
        return pathForResultFile ? this.resolvePath(pathForResultFile) : tmpdir();
    }

    public static get additionalArgumentsOption(): string {
        const testArguments = Utility.getConfiguration().get<string>("testArguments");
        return (testArguments && testArguments.length > 0) ? ` ${testArguments}` : "";
    }

    public static envFileSet(): boolean {
        return Utility.envFilePath !== "";
    }

    public static get envFileContents() {
        return Utility.envFileContentsCache;
    }

    public static getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration("dotnet-test-explorer");
    }

    public static getFqnTestName(testName: string): string {

        // Converts a test name to a fqn version
        // For instance MyNameSpace.Class("Nunit fixture").TestName("With some arguments here") => MyNameSpace.Class.TestName

        return testName
            .split(/\.(?![^\(]*\))/g) // Split on all . that are not in paranthesis
            .map((n) => {
                let name = n;

                const firstParanthesis = name.indexOf("(");

                if (firstParanthesis > -1) {
                    name = name.substring(0, firstParanthesis);
                }

                return name;
            })
            .join(".");
    }

    public static updateCache() {
        const configuration = Utility.getConfiguration();
        const osx = platform() === "darwin";

        Utility.showCodeLens = configuration.get<boolean>("showCodeLens", true);
        Utility.failed = Utility.getLensText(configuration, "codeLensFailed", "\u274c"); // Cross Mark
        Utility.passed = Utility.getLensText(configuration, "codeLensPassed", osx ? "\u2705" : "\u2714"); // White Heavy Check Mark / Heavy Check Mark
        Utility.skipped = Utility.getLensText(configuration, "codeLensSkipped", "\u26a0"); // Warning
        Utility.autoExpandTree = configuration.get<boolean>("autoExpandTree", false);
        Utility.skipBuild = Utility.additionalArgumentsOption.indexOf("--no-build") > -1;
        Utility.runInParallel = configuration.get<boolean>("runInParallel", false);

        if (this.watchedEnvFilePath !== "") {
            fs.unwatchFile(this.watchedEnvFilePath);
            this.watchedEnvFilePath = "";
        }
        Utility.envFilePath = configuration.get<string>("envFilePath", "");

        if (Utility.envFileSet) {
            const absoluteFilePath = this.getEnvFilePath(this.envFilePath);
            Logger.Log(`Loading env file contents from ${absoluteFilePath}`);

            const parseFile = () => {
                fs.readFile(absoluteFilePath, (err, data) => {
                    if (err) {
                        Logger.LogError("Error while loading env file", err);
                        return;
                    }
                    this.envFileContentsCache = parse(data, { debug: true });
                });
            };

            fs.watchFile(absoluteFilePath, () => {
                Logger.Log("EnvFile updated, reloading");
                parseFile();
            });
            this.watchedEnvFilePath = absoluteFilePath;

            parseFile();
        } else {
            this.envFileContentsCache = null;
        }
    }

    /**
     * @description
     * Checks to see if the @see{vscode.workspace.rootPath} is
     * the same as the directory given, and resolves the correct
     * string to it if not.
     * @param dir
     * The directory specified in the options.
     */
    public static resolvePath(dir: string): string {
        return path.isAbsolute(dir)
            ? dir
            : path.resolve(vscode.workspace.rootPath, dir);
    }

    private static autoExpandTree: boolean;
    private static showCodeLens: boolean;
    private static failed: string;
    private static passed: string;
    private static skipped: string;
    private static envFilePath: string;
    private static watchedEnvFilePath: string = "";
    private static envFileContentsCache: { [name: string]: string } | null;

    private static getLensText(configuration: vscode.WorkspaceConfiguration, name: string, fallback: string): string {
        // This is an invisible character that indicates the previous character
        // should be displayed as an emoji, which in our case adds some colour
        const emojiVariation = "\ufe0f";

        const setting = configuration.get<string>(name);
        return setting ? setting : (fallback + emojiVariation);
    }

    private static getEnvFilePath(relativePath: string): string {
        return path.resolve(vscode.workspace.workspaceFolders[0].uri.fsPath, this.envFilePath);
    }
}
