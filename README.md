[![Gitter chat](https://badges.gitter.im/gitterHQ/gitter.png)](https://gitter.im/vscode-dotnet-test-explorer/Lobby)

# .NET Core Test Explorer

## Features

* Test Explorer for .NET Core

## Prerequisites

* [.NET Core](https://www.microsoft.com/net/core) is installed
* NUnit and MSTest requires a dotnet [sdk](https://www.microsoft.com/net/download) version of >= 2.2.104 and running dotnet tooling in English (see [#77](https://github.com/formulahendry/vscode-dotnet-test-explorer/issues/77) for details).

## New in 0.7.4

* Build errors occurring when running test(s) are reported more clearly and does not requiere a rediscovery of the tests after fixing the build error.

Many thanks to @GeorchW for contributions to this release!

## Usage

Open a .NET Core test project, or set `dotnet-test-explorer.testProjectPath` to the folder path of .NET Core test project. Then, you will see all the tests in Test Explorer. More information on how to set the testProjectPath can be found below under Settings.

## Settings

The settings are available via `File / Preferences / Settings`. Navigate to extensions and .NET Core test explorer.

![image](https://user-images.githubusercontent.com/358570/88801296-c26fb380-d1a9-11ea-812f-6623665f354a.png)

#### Settings examples
`dotnet-test-explorer.testProjectPath`

Glob pattern that points to path of .NET Core test project(s). A common pattern is `"**/*Tests.csproj"`.

Given the folder structure
* root
  * testProjectOne
    * testproject1.Tests.csproj
  * testProjectTwo
    * testproject2.Tests.csproj

the glob pattern "+(testProjectOne|testProjectTwo)" or "**/*Tests.csproj" should add both of the test projects.

`dotnet-test-explorer.autoWatch`
 
 If true, starts dotnet watch test after test discovery is completed

`dotnet-test-explorer.testArguments`

Additional arguments that are added to the dotnet test command. These can for instance be used to collect code coverage data (`"/p:CollectCoverage=true /p:CoverletOutputFormat=lcov /p:CoverletOutput=../../lcov.info"`) or pass test settings (`"--settings:./myfilename.runSettings"`)


## Stopping the current test runner(s)

Press the stop button in the top menu. This also works as a reset of sorts so if the extension has managed to end up in a weird state where it thinks a test is running even though it is not or that the debugger is running even though it is not the stop button can solve these types of issues as well.

![test-explorer](images/stop.PNG)

## Logging

Text from the dotnet test output as well as debug info is written to the Output/Test explorer terminal window. To view the log you can access it simply by clicking the view log icon.

![showlog](images/showlog.png)

## Debugging (alpha)

To debug a test, right click the test and choose to Debug test. The option to run and debug test that appear in the code lens are provided by the omnisharp plugin and has nothing to do with this extension.

The debugger might get stuck before loading your test assembly code. If this happens you can continue the debug process (F5) and it should load the rest of the assemblies and stop and the desired breakpoint.


## Keyboard shortcuts

* Run all tests, default Alt+R Alt+A

* Rerun last command, default Alt+R Alt+R

* Run test(s) in context, default Alt+R Alt+C

## Known issues
##### Go to test does not work with multiple workspaces
This is because of limitations in the omnisharp extensions. We can only navigate to symbols which are in the currently selected workspace.

##### Test result is not shown in CodeLens / tree
Try and change the setting dotnet-test-explorer.pathForResultFile to point to a folder you have access right too. CodeLens functionality also requires the [C# extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode.csharp)) 

##### No tree view or color coded explorer for NUnit / MSTest
This requires you to run dotnet SDK version 2.2.104 or higher. The extension tries to run the commands with the English cli but if things are not working as expected anyway it may be due to the cli language (see [#77](https://github.com/formulahendry/vscode-dotnet-test-explorer/issues/77) for details).

##### xUnit projects assembly name needs to match the test class namespace
See [#201](https://github.com/formulahendry/vscode-dotnet-test-explorer/issues/201)

##### DisplayName attribute not working for xUnit
See [#56](https://github.com/formulahendry/vscode-dotnet-test-explorer/issues/56)

##### Project discovery with UNC Paths doesn't work
See [#179](https://github.com/formulahendry/vscode-dotnet-test-explorer/issues/179)

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

If you find any bug or have any suggestion/feature request, please submit the [issues](https://github.com/formulahendry/vscode-dotnet-test-explorer/issues) to the GitHub Repo.

## ❤️ Contributors

Thanks to all the [contributors](https://github.com/formulahendry/vscode-dotnet-test-explorer/graphs/contributors)!

Special thanks to Stefan Forsberg ([@stefanforsberg](https://github.com/stefanforsberg)) for maintaining the project and implementing so many cool features! Also thanks to Janaka Abeywardhana ([@janaka](https://github.com/janaka)) for maintaining the project!
