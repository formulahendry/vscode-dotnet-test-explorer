# Evaluation TODO

- [x] Get vstest platform code minimally working
        - [x] convert spawn to macOS
        - [x] vstest server spawns
        - [x] can make version request and get response successfully
- [x] Add license from source to all files
- [] Test discovery works and can see result data in debug mode
        - [x] Mstest project
        - [] Nunit project
        - [] Xunit projet
- [] Test execution works and can see result data in debug mode
        - [] Mstest project
        - [] Nunit project
        - [] Xunit project
- [] Does it perform better than than running `dotnet vstest` and parsing TRX?
- [] Are test discivery results and test execution results data schema the smae for key data?
- [] What new data do we have available?
- [] Can it handle multiple test projects in a single workspace?


# Track before shipping TODO

- Works cross platform
- Unit tests for VS Test Platform
- Auto discover config for execution host i.e. what is currently hardcoded in config.ts
- TSLint currently ignores **/src/vsTestPlatform/**/**.*. Undo and make TSLint happy (there'll be a lot). Leave winbase* excluded.