# .NET Core Test Explorer

## Features

* Test Explorer for .NET Core

## Prerequisites

* [.NET Core](https://www.microsoft.com/net/core) is installed

## Usage

* Open a .NET Core test project, or set `dotnet-test-explorer.testProjectPath` to the folder path of .NET Core test project. Then, you will see all the tests in Test Explorer.

![test-explorer](images/test-explorer.png)

## Settings

* `dotnet-test-explorer.testProjectPath`: Folder path of .NET Core test project. You could set the full path or the relative path to the workspace root path. (Default is **""**)
* `dotnet-test-explorer.msbuildRootTestMsg`: A root message for dotnet test command. In English it is 'The following Tests are available:' but for example in Polish it is 'Dostępne są następujące testy:'
* `dotnet-test-explorer.msbuildRootTestNotFoundMsg`: A root message for the dotnet test command when no tests are found. In English it is 'No test is available'.
* `dotnet-test-explorer.msbuildRootTestxUnitPrefix`: A root message for the dotnet test command for xUnit's bracketed output. In English, it is '[xUnit.net'.
* `dotnet-test-explorer.msbuildRootTestCopyrightPrefix`: A root message for the dotnet test command that is prefixed with the 'Copyright' disclaimer in the output. In English, it is 'Copyright (c) Microsoft Corporation.  All rights reserved.'.
* `dotnet-test-explorer.msbuildRootTestVersionsPrefix`: A root message for the dotnet test command that is prefixed on lines displaying the command line tools version. In English, it is 'Microsoft (R) Test Execution Command Line Tool Version'.
* `dotnet-test-explorer.msbuildRootTestRunForPrefix`: A root message for the dotnet test command that is prefixed on lines displaying the project where tests were sought. In English, it is 'Test run for'.
* `dotnet-test-explorer.useTreeView`: If false, will list all tests as the full namespace. When set to true a tree will be created based on the namespaces of the tests. (Only xUnit tests will be listed in a tree view) (Default is **true**)
* `dotnet-test-explorer.build`: If true, projects will be built when refreshing the test explorer. (Default is **false**)
* `dotnet-test-explorer.restore`: If true, dotnet restore will run when refreshing the test explorer. (Default is **false**)

## Telemetry data

By default, anonymous telemetry data collection is turned on to understand user behavior to improve this extension. To disable it, update the settings.json as below:
```json
{
    "dotnet-test-explorer.enableTelemetry": false
}
```

## Change Log

See Change Log [here](CHANGELOG.md)

## Issues

Currently, the extension is in the very initial phase. If you find any bug or have any suggestion/feature request, please submit the [issues](https://github.com/formulahendry/vscode-dotnet-test-explorer/issues) to the GitHub Repo.
