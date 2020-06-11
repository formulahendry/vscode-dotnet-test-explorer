export type TreeTestState = "Passed" | "Failed" | "Skipped" | "Running" | "NotRun";

export function mergeStates(a: TreeTestState | undefined, b: TreeTestState | undefined): TreeTestState | undefined {
    if (a === "Running" || b === "Running")
        return "Running";
    if (a === "Failed" || b === "Failed")
        return "Failed";
    if (a === "Skipped" || b === "Skipped")
        return "Skipped";
    if (a === "NotRun" || b === "NotRun")
        return "NotRun";
    if (a === "Passed" || b === "Passed")
        return "Passed";
    if (a !== undefined || b !== undefined)
        throw new Error("Not implemented");
    return undefined;
}


