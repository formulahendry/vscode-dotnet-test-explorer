# TODO

- When test project is renamed reflect in settings.
- As user can select the test project in a more intuitive way than editing settings.
- check testDirectoryPath config value is valid and contains a test.csproj file.
- Remove the root test folder name from the explorer view unless there are multiple test projects



Looks at setContext for setting the when-clause-context 
https://www.stardog.com/blog/extending-visual-studio-code/

TreeDataProvider TreeItem reference. Where setContext sets the value.
https://github.com/Microsoft/vscode/blob/2f6fd3db5d4486cabd08e2ef0982df65cafd3aac/src/vs/vscode.d.ts#L5066

GetTreeItem get's called each time the tree view node is expanded and for each node rendered.