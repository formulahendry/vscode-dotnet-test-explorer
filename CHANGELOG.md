## 0.7.5 (2021-01-18)
* [#289](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/289) : Update assembly extractor regexp to be compatible with net 5

## 0.7.4 (2020-08-02)
* [#282](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/282): F build error view
* [#281](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/281): Bump lodash from 4.17.15 to 4.17.19
* [#275](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/275): Add the csharp extension as a dependency
* [#270](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/270): Fix #267 

## 0.7.3 (2020-06-10)
* [#268](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/268): Improve test discovery experience
* [#261](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/261): Filter duplicate detected test folders
* [#246](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/246): Add openPanel command to and set Status Bar command to trigger
* [#257](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/257): Add option to merge tree nodes with only one child
* [#263](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/263): Upgrade packages
* [#260](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/260): Don't remove directories without tests

## 0.7.2 (2020-05-28)
* [#256](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/256): Show welcome message when no tests are discovered
* [#211](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/211): Fix "forever spinning"
* [#238](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/238): Fix warning message typo

## 0.7.1 (2019-06-12)
* [#219](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/219): Place code lens icon on lens row

## 0.7.0 (2019-05-09)
* [#209](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/209): Set cli language to english before executing our commands 
* [#208](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/208): Fixes to xunit theories names and go to test 
* [#204](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/204): Adds beta for debug test 

## 0.6.6 (2019-04-02)
* [#193](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/193): Added setting to run things in parallel
* [#192](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/192): Removed old way of returning test results

## 0.6.5 (2019-03-17)
* [#190](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/190): Re-work how we fetch test results
* [#188](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/188): Auto watch now works for multiple test directories

## 0.6.4 (2019-03-03)
* [#187](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/187): Made "go to test" more robust

## 0.6.3 (2019-02-22)
* [#184](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/184): Fixed codelens display for xunit

## 0.6.2 (2019-02-12)
* [#183](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/183): Fixed crash for VSCode Version 1.31.0 on Mac.

## 0.6.1 (2019-01-21)
* [#176](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/176): Fix typo discoverd -> discovered
* [#174](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/174): Don't build when user has passed --no-build

## 0.6.0 (2018-11-14)
* [#165](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/165): Multiple workspace support
* [#164](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/164): Double-quote argument to dotnet --filter
* [#156](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/156): Fix unfound tests when using Go to Test feature with F# 

## 0.5.5 (2018-11-04)
* [#158](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/158): Fixed code lense and test in context after executeDocumentSymbolProvider changes
* [#152](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/152): Better handling when tests fail to build
* [#151](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/151): Allow user to cancel running test proccesses

## 0.5.4 (2018-09-26)
* [#146](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/146): Support dot in inline data
* [#142](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/142): Fix for tests with similar names get run together
* [#141](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/141): Better navigate to test when multiple symbols points to same test

## 0.5.3 (2018-09-11)
* [#138](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/138): Better support for TestFixture names
* [#135](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/135): Supporting special characters in test cases on windows

## 0.5.2 (2018-08-27)
* [#130](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/130): Update tree based on test results
* [#126](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/126): Fixed so custom tests parameters does not cause display issues

## 0.5.1 (2018-08-23)
* [#122](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/122): Handle testProjectPath change
* [#118](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/118): More telemetry
* [#117](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/117): Better test result icons for light theme

## 0.5.0 (2018-08-11)
* [#112](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/112): Support multiple test projects in a workspace 
* [#111](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/111): Left clicking on test open test by default

## 0.4.0 (2018-07-11)
* [#100](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/100): Status bar displays test status
* [#97](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/97): Added setting for additional test arguments

## 0.3.1 (2018-06-13)
* [#92](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/92): Added setting to enable auto watching
* [#90](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/90): Adding double quotes to filter command line option

## 0.3.0 (2018-05-15)
* [#74](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/74): Move the view to Test view container
* [#72](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/72): Add failed tests to problems view
* [#70](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/70): Show spinner for currently running test(s)

## 0.2.3 (2018-04-27)
* [#67](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/67): Option to auto expand tree
* [#62](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/62): Better support for xunit theories
* [#51](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/51): TreeView support for NUnit and MSTest

## 0.2.2 (2018-04-16)
* [#50](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/52): Can use relative path for test result file path
* [#45](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/45): Run test(s) in context
* [#46](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/48): Changing pathForResultFile does not require code reload
* [#43](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/43): Go to test code from tree

## 0.2.1 (2018-03-20)
* [#42](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/42): Show test results in tree for xunit
* [#41](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/41): Show spinner while discovering tests
* [#40](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/40): Setting for where to store test result file

## 0.2.0 (2017-11-26)
* [#24](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/24): Display test results in CodeLens for C# test projects

## 0.1.2 (2017-10-22)
* [#20](https://github.com/formulahendry/vscode-dotnet-test-explorer/pull/20): Add support for test names that contain data

## 0.1.1 (2017-08-23)
* Support for multiple projects
* Added options for disabling rebuild and restore

## 0.1.0 (2017-08-21)
* Support tree view for xUnit
* Evaluate working dir before running all tests

## 0.0.3 (2017-08-14)
* Add support for xUnit
* Enable relative path of test project
* Allow to specify searched text in MSBuld output

## 0.0.2 (2017-08-12)
* Not show pop-up error message

## 0.0.1 (2017-08-12)
* Initial Release
