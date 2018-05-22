/**
 * Interface with the available extension configuration
 */
export interface IVSTestConfig {
    output: string, //relative output solution folder
    framework: string,
    outputFileName : string
}


/*{
    "vstest.dotnet": {
        "testFiles": [{
            "glob":"",
            "framework":"netcoreapp1.0"
        }]
    }
}*/