import * as assert from "assert";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as sinon from "sinon";
import { Executor } from "../src/executor";
import { discoverTests } from "../src/testDiscovery";

suite("Test discovery", () => {
    const testDirectoryPath = "xyz";
    const dotnetTestOptions = "foo";

    const dotnetTestExecCmd = `dotnet test -t -v=q${dotnetTestOptions}`;
    const assemblyFilePath = "/bin/TestAssembly.dll";

    const tmpDir = "/temp";
    const vsTestOutputTempDir = path.join(tmpDir, "test-explorer-discover-123456");
    const vsTestOutputFilePath = path.join(vsTestOutputTempDir, "output.txt");

    const dotnetVstestExecCmd = buildDotnetVstestCommand([assemblyFilePath], vsTestOutputFilePath);

    const execStub = sinon.stub(Executor, "exec");
    const fsMkdtempSyncStub = sinon.stub(fs, "mkdtempSync");
    const osTmpdirStub = sinon.stub(os, "tmpdir");
    const fsExistsSyncStub = sinon.stub(fs, "existsSync");
    const fsUnlinkSyncStub = sinon.stub(fs, "unlinkSync");
    const fsRmdirSyncStub = sinon.stub(fs, "rmdirSync");
    // Typescript does not know (and can't be told) which overload of window.showWarningMessage
    // we want to stub, so we'll just cast the arguments to any.
    const fsReadFileStub: sinon.SinonStub = sinon.stub(fs, "readFile");

    setup(() => {
        execStub.callsArgWithAsync(1, "Executor.exec - Missing setup matching passed arguments.");
        fsReadFileStub.callsArgWithAsync(2, "fs.readfile - Missing setup matching passed arguments.");

        osTmpdirStub.returns(tmpDir);

        fsMkdtempSyncStub.withArgs(path.join(tmpDir, "test-explorer-discover-"))
            .returns(vsTestOutputTempDir);
    });

    teardown(() => {
        execStub.reset();
        fsMkdtempSyncStub.reset();
        osTmpdirStub.reset();
        fsExistsSyncStub.reset();
        fsUnlinkSyncStub.reset();
        fsRmdirSyncStub.reset();
        fsReadFileStub.reset();
    });

    test("Fully qualified test names returned when dotnet test outputs FQ test names", () => {
        const testNames = ["Ns1.Class1.Test1", "Ns1.Class1.Test2"];

        execStub.withArgs(dotnetTestExecCmd, sinon.match.func, testDirectoryPath)
            .callsArgWith(1, null, buildDotnetTestOutput(testNames, assemblyFilePath), "");

        return discoverTests(testDirectoryPath, dotnetTestOptions)
            .then((result) => assert.deepEqual(result.testNames, testNames));
    });

    test("Promise rejected when dotnet test failing", () => {
        const error = "error";

        execStub.withArgs(dotnetTestExecCmd, sinon.match.func, testDirectoryPath)
            .callsArgWithAsync(1, error);

        return discoverTests(testDirectoryPath, dotnetTestOptions)
            .then((r) => { throw new Error("Promise was unexpectedly fulfilled. Result: " + r); })
            .catch((e) => assert.equal(e, error));
    });

    test("Empty list returned when dotnet test outputs empty list", () => {
        execStub.withArgs(dotnetTestExecCmd, sinon.match.func, testDirectoryPath)
            .callsArgWithAsync(1, null, buildDotnetTestOutput([], assemblyFilePath), "");

        return discoverTests(testDirectoryPath, dotnetTestOptions)
            .then((result) => assert.deepEqual(result.testNames, []));
    });

    test("Fully qualified test names returned using dotnet vstest when dotnet test output is missing fq names", () => {
        const testNames = ["Test1", "Test2"];
        const fqTestNames = ["Ns1.Class1.Test1", "Ns1.Class1.Test2"];

        fsReadFileStub.withArgs(vsTestOutputFilePath, "utf8", sinon.match.func)
            .callsArgWithAsync(2, null, fqTestNames.join("\r\n"));

        execStub.withArgs(dotnetTestExecCmd, sinon.match.func, testDirectoryPath)
            .callsArgWithAsync(1, null, buildDotnetTestOutput(testNames, assemblyFilePath), "");

        execStub.withArgs(dotnetVstestExecCmd, sinon.match.func, testDirectoryPath)
            .callsArgWithAsync(1, null, "");

        return discoverTests(testDirectoryPath, dotnetTestOptions)
            .then((result) => assert.deepEqual(result.testNames, fqTestNames));
    });

    test("Promise rejected when dotnet vstest output file read operation fails", () => {
        const error = "read error";
        const testNames = ["Test1", "Test2"];

        fsReadFileStub.withArgs(vsTestOutputFilePath, "utf8", sinon.match.func)
            .callsArgWithAsync(2, error);

        execStub.withArgs(dotnetTestExecCmd, sinon.match.func, testDirectoryPath)
            .callsArgWithAsync(1, null, buildDotnetTestOutput(testNames, assemblyFilePath), "");

        execStub.withArgs(dotnetVstestExecCmd, sinon.match.func, testDirectoryPath)
            .callsArgWithAsync(1, null, "");

        return discoverTests(testDirectoryPath, dotnetTestOptions)
            .then((r) => { throw new Error("Promise was unexpectedly fulfilled. Result: " + r); })
            .catch((e) => assert.equal(e, error));
    });

    test("Promise rejected when dotnet vstest returns error", () => {
        const error = "vstest error";
        const testNames = ["Test1", "Test2"];

        execStub.withArgs(dotnetTestExecCmd, sinon.match.func, testDirectoryPath)
            .callsArgWithAsync(1, null, buildDotnetTestOutput(testNames, assemblyFilePath), "");

        execStub.withArgs(dotnetVstestExecCmd, sinon.match.func, testDirectoryPath)
            .callsArgWithAsync(1, error, "");

        return discoverTests(testDirectoryPath, dotnetTestOptions)
            .then((r) => { throw new Error("Promise was unexpectedly fulfilled. Result: " + r); })
            .catch((e) => assert.equal(e, error));
    });

    test("Promise rejected when failed to extract test assembly file name from dotnet test output", () => {
        const dotnetTestOutput = getDotnetTestOutputWithoutTestAssemblyPath();
        const errorMessage = `Couldn't extract assembly paths from dotnet test output: ${dotnetTestOutput}`;

        execStub.withArgs(dotnetTestExecCmd, sinon.match.func, testDirectoryPath)
            .callsArgWithAsync(1, null, dotnetTestOutput, "");

        return discoverTests(testDirectoryPath, dotnetTestOptions)
            .then((r) => { throw new Error("Promise was unexpectedly fulfilled. Result: " + r); })
            .catch((e) => {
                assert.equal(e.message, errorMessage);
            });
    });

    test("Remove vstest output file and directory after vstest execution", () => {
        const testNames = ["Test1", "Test2"];

        fsReadFileStub.withArgs(vsTestOutputFilePath, "utf8", sinon.match.func)
            .callsArgWithAsync(2, null, "");

        execStub.withArgs(dotnetTestExecCmd, sinon.match.func, testDirectoryPath)
            .callsArgWithAsync(1, null, buildDotnetTestOutput(testNames, assemblyFilePath), "");

        execStub.withArgs(dotnetVstestExecCmd, sinon.match.func, testDirectoryPath)
            .callsArgWithAsync(1, null, "");

        fsExistsSyncStub.withArgs(vsTestOutputFilePath).returns(true);

        return discoverTests(testDirectoryPath, dotnetTestOptions)
            .then((r) => {
                assert(fsUnlinkSyncStub.calledAfter(fsReadFileStub), "unlinkSync must be called after readFile");
                assert(fsUnlinkSyncStub.calledWith(vsTestOutputFilePath), "vstest output file must be deleted");
                assert(fsRmdirSyncStub.calledWith(vsTestOutputTempDir), "temporary directory for vstest output must be deleted");
            });
    });

    test("Solution with multiple test projects fully qualified test names returned using dotnet vstest when dotnet test output is missing fq names", () => {
        const testAssemblyFilePaths = [
            "/bin/TestAssembly1.dll",
            "/bin/TestAssmebly2.dll",
        ];

        const testNames = ["Test1", "Test2", "Test3", "Test4"];
        const fqTestNames = [
            "Ns1.Class1.Test1",
            "Ns1.Class1.Test2",
            "Ns2.Class2.Test3",
            "Ns2.Class2.Test4",
        ];

        const dotnetVstestMultiProjectExecCmd = buildDotnetVstestCommand(testAssemblyFilePaths, vsTestOutputFilePath);

        fsReadFileStub.withArgs(vsTestOutputFilePath, "utf8", sinon.match.func)
            .callsArgWithAsync(2, null, fqTestNames.join("\r\n"));

        execStub.withArgs(dotnetTestExecCmd, sinon.match.func, testDirectoryPath)
            .callsArgWithAsync(1, null, buildDotnetTestSolutionOutput(testNames, testAssemblyFilePaths), "");

        execStub.withArgs(dotnetVstestMultiProjectExecCmd, sinon.match.func, testDirectoryPath)
            .callsArgWithAsync(1, null, "");

        return discoverTests(testDirectoryPath, dotnetTestOptions)
            .then((result) => assert.deepEqual(result.testNames, fqTestNames));
    });

    test("Dotnet test results returned with a warning message when dotnet vstest /ListFullyQualifiedTests switch is not supported", () => {
        const testNames = ["Test1", "Test2"];

        execStub.withArgs(dotnetTestExecCmd, sinon.match.func, testDirectoryPath)
            .callsArgWithAsync(1, null, buildDotnetTestOutput(testNames, assemblyFilePath), "");

        execStub.withArgs(dotnetVstestExecCmd, sinon.match.func, testDirectoryPath)
            .callsArgWithAsync(1, new Error(), "", getDotnetVstestListFqnFlagMissingErrorOutput());

        return discoverTests(testDirectoryPath, dotnetTestOptions)
            .then((result) => {
                assert.deepEqual(result.testNames, testNames);
                assert.deepEqual(
                    result.warningMessage,
                    {
                        text: "dotnet sdk >=2.1.2 required to retrieve fully qualified test names. Returning non FQ test names.",
                        type: "DOTNET_SDK_FQN_NOT_SUPPORTED",
                    });
            });
    });
});

function buildDotnetTestOutput(testNames: string[], testAssemblyFilePath: string) {
    const testsLists = testNames.map((n) => `    ${n}`).join("\r\n");
    return String.raw`
Build started, please wait...
Build completed.

Test run for ${testAssemblyFilePath}(.NETCoreApp,Version=v2.0)
Microsoft (R) Test Execution Command Line Tool Version 15.6.0-preview-20180109-01
Copyright (c) Microsoft Corporation.  All rights reserved.

The following Tests are available:
` + testsLists;
}

function getDotnetTestOutputWithoutTestAssemblyPath() {
    return String.raw`
Build started, please wait...
Build completed.

Microsoft (R) Test Execution Command Line Tool Version 15.6.0-preview-20180109-01
Copyright (c) Microsoft Corporation.  All rights reserved.

The following Tests are available:
    SomeTest
`;
}

function buildDotnetTestSolutionOutput(testNames: string[], testAssemblyFilePaths: string[]) {
    let output = new Array<string>(testAssemblyFilePaths.length)
        .fill("Build started, please wait...")
        .join("\r\n");

    testAssemblyFilePaths.forEach((testAssemblyFilePath) => {
        output += String.raw`
Build completed.

Test run for ${testAssemblyFilePath}(.NETCoreApp,Version=v2.0)
Microsoft (R) Test Execution Command Line Tool Version 15.6.0-preview-20180109-01
Copyright (c) Microsoft Corporation.  All rights reserved.

The following Tests are available:
`;
    });

    const testsLists = testNames.map((n) => `    ${n}`).join("\r\n");
    output += testsLists;

    return output;
}

function buildDotnetVstestCommand(testAssemblyFilePaths: string[], vstestOutputFilePath: string) {
    const testAssembliesParam = testAssemblyFilePaths.map((f) => `"${f}"`).join(" ");
    return `dotnet vstest ${testAssembliesParam} /ListFullyQualifiedTests /ListTestsTargetPath:"${vstestOutputFilePath}"`;
}

function getDotnetVstestListFqnFlagMissingErrorOutput() {
    return String.raw`
The test source file "/ListFullyQualifiedTests" provided was not found.
    `;
}
