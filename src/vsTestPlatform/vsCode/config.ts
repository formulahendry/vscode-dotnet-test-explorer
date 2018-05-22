import * as vscode from "vscode";
import { IVSTestConfig } from "../vsTest/vsTestConfig";

export function getCurrentAdapterName() {
    //return vscode.workspace.getConfiguration("vstest.adapterName");
    return "dotnet";
}

export function getConfigurationForAdatper(): IVSTestConfig {
    return vscode.workspace.getConfiguration(`vstest.${getCurrentAdapterName()}`) as any;
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