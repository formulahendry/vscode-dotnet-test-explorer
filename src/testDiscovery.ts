import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { Executor } from "./executor";

export function discoverTests(testDirectoryPath: string, dotnetTestOptions: string): Promise<string[]> {
    return executeDotnetTest(testDirectoryPath, dotnetTestOptions)
        .then((stdout) => {
            const testNames = extractTestNames(stdout);
            if (!isMissingNamespaces(testNames)) {
                return testNames;
            }

            const testAssemblyPath = extractTestAssemblyPath(stdout);
            if (!testAssemblyPath) {
                throw new Error(`Couldn't extract test assembly path from dotnet test output: ${stdout}`);
            }

            return discoverTestsWithVstest(testAssemblyPath);
        });
}

function executeDotnetTest(testDirectoryPath: string, dotnetTestOptions: string): Promise<string> {
    return new Promise((resolve, reject) => {
        Executor.exec(`dotnet test -t -v=q${dotnetTestOptions}`, (err, stdout: string, stderr) => {
            if (err) {
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
        .filter((item) => item && item.startsWith("  "))
        .sort()
        .map((item) => item.trim());
}

function extractTestAssemblyPath(testCommandStdout: string): string {
    const testRunLineRegex = /^Test run for (.+\.dll)\(.+\)/m;
    const match = testCommandStdout.match(testRunLineRegex);

    if (match) {
        return match[1];
    }
}

function isMissingNamespaces(testNames: string[]): boolean {
    return testNames.some((name) => !name.includes("."));
}

function discoverTestsWithVstest(testAssemblyPath: string): Promise<string[]> {
    const testOutputFilePath = prepareTestOutput();
    return executeDotnetVstest(testAssemblyPath, testOutputFilePath)
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

function executeDotnetVstest(testAssembly: string, listTestsTargetPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        Executor.exec(
            `dotnet vstest "${testAssembly}" --ListFullyQualifiedTests --ListTestsTargetPath:"${listTestsTargetPath}"`,
            (err, stdout: string, stderr) => {
                if (err) {
                    reject(err);
                }

                resolve(stdout);
            });
    });
}
