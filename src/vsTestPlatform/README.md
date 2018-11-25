# Evaluation TODO

- [x] Get vstest platform code minimally working
  - [x] convert spawn to macOS
  - [x] vstest server spawns
  - [x] can make version request and get response successfully
- [x] Add license from source to all files
- [x] Test discovery works and can see result data in debug mode
  - [x] Mstest project
  - [x] Nunit project
  - [x] Xunit projet
- [ ] Test execution works and can see result data in debug mode
  - [ ] Mstest project
  - [ ] Nunit project
  - [ ] Xunit project
- [ ] Does it perform better than than running `dotnet vstest` and parsing TRX?
- [x] Check if test **discovery** results data schema are the smae across test frameworks for key data?
  - displayName value is FQN for Xunit but not for Nunit and Mstest. See examples below. Believe this is the same as TRX.
- [ ] Check if test **execution** results data schema are the smae across test frameworks for key data?
- [ ] Check what new data do we have available?
- [ ] Can it handle multiple test projects in a single workspace?

## Check before shipping TODO

- Works cross platform
- Unit tests for VS Test Platform
- Auto discover config for execution host i.e. what is currently hardcoded in config.ts
- TSLint currently ignores **/src/vsTestPlatform/**/**.*. Undo and make TSLint happy (there'll be a lot). Leave winbase* excluded.

## Test Discovery data responses

The following are key/value from the json

### Nunit

```javascript
isRunning:false
plainObject:Object
fullyQualifiedName:"NunitTests.TestClass1.AnotherPass"
executorUri:"executor://NUnit3TestExecutor"
source:"/Users/janaka/code-projects/vscode-extentions/vscode-dotnet-test-explorer/test/nunit/bin/debug/netcoreapp2.0/NunitTests.dll"
codeFilePath:"/Users/janaka/code-projects/vscode-extentions/vscode-dotnet-test-explorer/test/nunit/TestClass1.cs"
displayName:"AnotherPass"
id:"8b95092a-43d6-e6c1-8755-e9886078ed34"
lineNumber:18
```

### Xunit

```javascript
isRunning:false
plainObject:Object
fullyQualifiedName:"XunitTests.TestClass1.Pass"
executorUri:"executor://xunit/VsTestRunner2/netcoreapp"
source:"/Users/janaka/code-projects/vscode-extentions/vscode-dotnet-test-explorer/test/xunittests/bin/debug/netcoreapp2.0/XunitTests.dll"
codeFilePath:"/Users/janaka/code-projects/vscode-extentions/vscode-dotnet-test-explorer/test/xunittests/TestClass1.cs"
displayName:"XunitTests.TestClass1.Pass"
id:"bd43f0f0-1d15-11da-f753-733a2d22cb4b"
lineNumber:11
```

### Mstest

```javascript
isRunning:false
plainObject:Object
fullyQualifiedName:"MsTestTests.TestClass1.Pass"
executorUri:"executor://MSTestAdapter/v2"
source:"/Users/janaka/code-projects/vscode-extentions/vscode-dotnet-test-explorer/test/mstest/bin/debug/netcoreapp2.0/MsTestTests.dll"
codeFilePath:"/Users/janaka/code-projects/vscode-extentions/vscode-dotnet-test-explorer/test/mstest/TestClass1.cs"
displayName:"Pass"
id:"5736fbf0-a673-f686-0c30-35bd962d1f20"
lineNumber:12
testClassName:"MsTestTests.TestClass1"
```