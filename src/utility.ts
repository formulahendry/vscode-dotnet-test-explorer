"use strict";
import { platform, tmpdir } from "os";
import * as path from "path";
import * as vscode from "vscode";

export class Utility {
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

    public static get defaultCollapsableState(): vscode.TreeItemCollapsibleState {
        return Utility.autoExpandTree ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed;
    }

    public static get pathForResultFile(): string {
        const pathForResultFile = Utility.getConfiguration().get<string>("pathForResultFile");
        return pathForResultFile ? this.resolvePath(pathForResultFile) : tmpdir();
    }

    public static getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration("dotnet-test-explorer");
    }

    public static updateCache() {
        const configuration = Utility.getConfiguration();
        const osx = platform() === "darwin";

        Utility.showCodeLens = configuration.get<boolean>("showCodeLens", true);
        Utility.failed = Utility.getLensText(configuration, "codeLensFailed", "\u274c"); // Cross Mark
        Utility.passed = Utility.getLensText(configuration, "codeLensPassed", osx ? "\u2705" : "\u2714"); // White Heavy Check Mark / Heavy Check Mark
        Utility.skipped = Utility.getLensText(configuration, "codeLensSkipped", "\u26a0"); // Warning
        Utility.autoExpandTree = configuration.get<boolean>("autoExpandTree", false);
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

    private static getLensText(configuration: vscode.WorkspaceConfiguration, name: string, fallback: string): string {
        // This is an invisible character that indicates the previous character
        // should be displayed as an emoji, which in our case adds some colour
        const emojiVariation = "\ufe0f";

        const setting = configuration.get<string>(name);
        return setting ? setting : (fallback + emojiVariation);
    }
}
