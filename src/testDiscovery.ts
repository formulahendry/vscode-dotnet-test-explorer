import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Executor } from "./executor";
import { Logger } from "./logger";
import { IMessage } from "./messages";

export interface IDiscoverTestsResult {
    testNames: string[];
    warningMessage?: IMessage;
}

export function discoverTests(testDirectoryPath: string, dotnetTestOptions: string): Promise<IDiscoverTestsResult> {
    return executeDotnetTest(testDirectoryPath, dotnetTestOptions)
        .then((stdout) => {

            const testNames = extractTestNames(stdout);
            if (!isMissingFqNames(testNames)) {
                return { testNames };
            }

            const assemblyPaths = extractAssemblyPaths(stdout);
            if (assemblyPaths.length === 0) {
                throw new Error(`Couldn't extract assembly paths from dotnet test output: ${stdout}`);
            }

            return discoverTestsWithVstest(assemblyPaths, testDirectoryPath)
                .then((results) => {
                    return { testNames: results };
                })
                .catch((error: Error) => {
                    if (error instanceof ListFqnNotSupportedError) {
                        return {
                            testNames,
                            warningMessage: {
                                text: "dotnet sdk >=2.1.2 required to retrieve fully qualified test names. Returning non FQ test names.",
                                type: "DOTNET_SDK_FQN_NOT_SUPPORTED",
                            },
                        };
                    }

                    throw error;
                });
        });
}

function executeDotnetTest(testDirectoryPath: string, dotnetTestOptions: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const command = `dotnet test -t -v=q${dotnetTestOptions}`;

        Logger.Log(`Executing ${command} in ${testDirectoryPath}`);

        Executor.exec(command, (err: Error, stdout: string, stderr: string) => {
            if (err) {
                Logger.LogError(`Error while executing ${command}`, stdout);

                reject(err);
                return;
            }

            resolve(stdout);
        }, testDirectoryPath);
    });
}

function extractTestNames(testCommandStdout: string): string[] {
    return testCommandStdout
        .split(/[\r\n]+/g)
        /*
        * The dotnet-cli prefixes all discovered unit tests
        * with whitespace. We can use this to drop any lines of
        * text that are not relevant, even in complicated project
        * structures.
        **/
        .filter((item) => item && item.startsWith("    "))
        .sort()
        .map((item) => item.trim());
}

function extractAssemblyPaths(testCommandStdout: string): string[] {
    const testRunLineRegex = /^Test run for (.+\.dll)\(.+\)/gm;
    const results = [];
    let match = null;

    do {
        match = testRunLineRegex.exec(testCommandStdout);
        if (match) {
            results.push(match[1]);
        }
    }
    while (match);

    return results;
}

function isMissingFqNames(testNames: string[]): boolean {
    return testNames.some((name) => !name.includes("."));
}

function discoverTestsWithVstest(assemblyPaths: string[], testDirectoryPath: string): Promise<string[]> {
    const testOutputFilePath = prepareTestOutput();
    return executeDotnetVstest(assemblyPaths, testOutputFilePath, testDirectoryPath)
        .then(() => readVstestTestNames(testOutputFilePath))
        .then((result) => {
            cleanTestOutput(testOutputFilePath);
            return result;
        })
        .catch((err) => {
            cleanTestOutput(testOutputFilePath);
            throw err;
        });
}

function readVstestTestNames(testOutputFilePath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        fs.readFile(testOutputFilePath, "utf8", (err, data: string) => {
            if (err) {
                reject(err);
                return;
            }

            const results = data
                .split(/[\r\n]+/g)
                .filter((s) => !!s)
                .sort();

            resolve(results);
        });
    });
}

function prepareTestOutput(): string {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "test-explorer-discover-"));
    return path.join(tempDir, "output.txt");
}

function cleanTestOutput(testOutputFilePath: string) {
    if (fs.existsSync(testOutputFilePath)) {
        fs.unlinkSync(testOutputFilePath);
    }

    fs.rmdirSync(path.dirname(testOutputFilePath));
}

function executeDotnetVstest(assemblyPaths: string[], listTestsTargetPath: string, testDirectoryPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const testAssembliesParam = assemblyPaths.map((f) => `"${f}"`).join(" ");
        const command = `dotnet vstest ${testAssembliesParam} /ListFullyQualifiedTests /ListTestsTargetPath:"${listTestsTargetPath}"`;

        Logger.Log(`Executing ${command} in ${testDirectoryPath}`);

        Executor.exec(
            command,
            (err: Error, stdout: string, stderr: string) => {
                if (err) {
                    Logger.LogError(`Error while executing ${command}.`, err);

                    const flagNotRecognizedRegex = /\/ListFullyQualifiedTests/m;
                    if (flagNotRecognizedRegex.test(stderr)) {
                        reject(new ListFqnNotSupportedError());
                    } else {
                        reject(err);
                    }

                    return;
                }

                resolve(stdout);
            }, testDirectoryPath);
    });
}

class ListFqnNotSupportedError extends Error {
    constructor() {
        super("Dotnet vstest doesn't support /ListFullyQualifiedTests switch.");

        Error.captureStackTrace(this, ListFqnNotSupportedError);
    }
}
