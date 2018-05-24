import * as vscode from "vscode";
import { IVSTestConfig } from "../vsTest/vsTestConfig";

export function getCurrentAdapterName() {
    // return vscode.workspace.getConfiguration("vstest.adapterName");
    return "dotnet";
}

export function getConfigurationForAdatper(): IVSTestConfig {
    // return vscode.workspace.getConfiguration(`vstest.${getCurrentAdapterName()}`) as any;
    // FIXME: fix hardcoded config. Why do we need these? Should be able to deduce these values. 
    return {
        "output": "bin/debug", // isn't this the convention
        "framework": "netcoreapp2.0", // used to construct path. can come from *.test.csproj
        // "outputFileName": "NunitTests.dll"
        // "outputFileName": "XunitTests.dll"
        "outputFileName": "MsTestTests.dll"
    }
}

export function isExtensionEnabled(): boolean {
    const configuration  = vscode.workspace.getConfiguration(`vstest`);
    const value = configuration.get("enable");
    return value == true || !value;
}

export function isAutoInitializeEnabled(): boolean {
    const configuration  = vscode.workspace.getConfiguration(`vstest`);
    const value = configuration.get("autoInitialize");
    return value == true;
}