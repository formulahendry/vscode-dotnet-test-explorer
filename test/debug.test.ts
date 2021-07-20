import * as assert from "assert";
import * as vscode from "vscode";
import { Debug } from "../src/debug";

suite("Debug tests", () => {

    test("Returns setting up debug on first call", () => {
        const results = new Debug().onData("data");

        assert.equal(results.isSettingUp, true);
    });

    test("Detects that debug is ready for attach has started", () => {
        const debug = new Debug();

        let results = debug.onData("data");
        results = debug.onData(`
            This is output from vstest
            Host debugging is enabled
            Tra la lalala la
        `, results);

        assert.equal(results.isSettingUp, true);
        assert.equal(results.waitingForAttach, true);
    });

    test("Detects the process id that debugger is running on", () => {
        const debug = new Debug();

        const results = debug.onData(`
            This is output from vstest
            Process Id: 35245,
            Tra la lalala la
        `);

        assert.equal(results.isSettingUp, true);
        assert.equal(results.processId, "35245");
    });

    test("When process is is known and debugger is waiting for attach a debug configuration is returned", () => {
        const debug = new Debug();

        let results = debug.onData("data");

        results = debug.onData(`
            This is output from vstest
            Host debugging is enabled
            Tra la lalala la
        `, results);

        results = debug.onData(`
            This is output from vstest
            Process Id: 35245,
            Tra la lalala la
        `, results);

        assert.equal(results.isSettingUp, true);
        assert.equal(results.processId, "35245");

        assert.equal(results.config.name, "NET TestExplorer Core Attach");
        assert.equal(results.config.type, "coreclr");
        assert.equal(results.config.request, "attach");
        assert.equal(results.config.processId, "35245");
    });
});
