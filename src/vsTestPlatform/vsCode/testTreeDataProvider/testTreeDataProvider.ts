import * as vscode from "vscode";
import * as Utils from "../Utils";
import * as Collections from "typescript-collections";
import { TestManager } from "../vsTest/vsTestManager";
import { TestModel, Test, TestResult, TestOutcome } from "../../vsTest/vsTestModel"
import { VSTestServiceIDE } from "../vsTest/vsTestServiceIDE"
import { VSTestServiceStatus } from "../../vsTest/vsTestService"
import { getConfigurationForAdatper, getCurrentAdapterName, isAutoInitializeEnabled } from "../config";
import { GroupByFilter, GroupByQuickPickItemType } from "./groupByFilter"

export function RegisterVSTestTreeProvider(context: vscode.ExtensionContext) {
    let testTreeDataProvider: TestTreeDataProvider;
    testTreeDataProvider = new TestTreeDataProvider(context);
    vscode.window.registerTreeDataProvider("vstest.explorer.vsTestTree", testTreeDataProvider);
}

/**
 * A class to handle the group lables of the tests
 */
class Label {
    private tests: Array<Test>;

    private displayName: string;

    private outcome: TestOutcome;



    constructor(displayName: string, outcome: TestOutcome, tests: Array<Test> = null) {
        this.displayName = displayName;
        this.tests = tests;
        this.outcome = outcome;
    }

    public getChildrenLenght(): number {
        return this.getChildren() ? this.getChildren().length : 0;
    }

    public getDisplayName() {
        return `${this.displayName} (${this.getChildrenLenght()})`;
    }

    public setTests(tests: Array<Test>) {
        this.tests = tests;
    }

    public getChildren(): Array<Test> {
        return this.tests;
    }

    public getOutcome(): TestOutcome {
        return this.outcome;
    }

    public getId(): string {
        return this.displayName;
    }
}

/**
 * Type that the tree provider handles
 */
type TestTreeType = Label | Test;

/**
 * Additional data to help the tree data provider
 */
class TestAdditionalData {
    collapsibleState: vscode.TreeItemCollapsibleState;
}

export class TestTreeDataProvider implements vscode.TreeDataProvider<TestTreeType> {
    public _onDidChangeTreeData: vscode.EventEmitter<TestTreeType | null> = new vscode.EventEmitter<TestTreeType | null>();
    readonly onDidChangeTreeData: vscode.Event<TestTreeType | null> = this._onDidChangeTreeData.event;

    private groupByFilter: GroupByFilter = new GroupByFilter();

    private testService: VSTestServiceIDE;

    private testsAdditionalData: Collections.Dictionary<string, TestAdditionalData> = new Collections.Dictionary<string, TestAdditionalData>();

    private selectedItem: TestTreeType = null;



    private isTestExplorerInitialized = false;

    constructor(private context: vscode.ExtensionContext) {

        const disposable = vscode.commands.registerCommand("vstest.explorer.open", event => this.goToTestLocation(event));
        context.subscriptions.push(disposable);

        const runCommand = vscode.commands.registerCommand("vstest.execution.runSelected",
            (item) => {
                if (item) {
                    this.runTests(item);
                }
                else {
                    this.runTests(this.selectedItem);
                }
            });
        context.subscriptions.push(runCommand);

        const debugCommand = vscode.commands.registerCommand("vstest.execution.debugSelected",
            (item) => {
                if (item) {
                    this.debugTests(item);
                }
                else {
                    this.debugTests(this.selectedItem);
                }
            });
        context.subscriptions.push(debugCommand);

        const restartExplorerCommand = vscode.commands.registerCommand("vstest.explorer.restart",
            () => this.restart());
        context.subscriptions.push(restartExplorerCommand);

        const groupByExplorerCommand = vscode.commands.registerCommand("vstest.explorer.groupBy",
            () => this.selectGroupBy());
        context.subscriptions.push(groupByExplorerCommand);

        const refreshExplorerCommand = vscode.commands.registerCommand("vstest.explorer.refresh",
            () => this.discoveryTests());
        context.subscriptions.push(refreshExplorerCommand);

        const runAllTestCommand = vscode.commands.registerCommand("vstest.execution.runAll",
            () => this.runAllTests());
        context.subscriptions.push(runAllTestCommand);

        const showTestResult = vscode.commands.registerCommand("vstest.explorer.showResult", event => this.showTestResult(event));
        context.subscriptions.push(showTestResult);

        const initializeTestExplorer = vscode.commands.registerCommand("vstest.explorer.initialize", event => this.initialize());
        context.subscriptions.push(showTestResult);

        vscode.workspace.onDidChangeConfiguration(() => {
            this.testService.updateConfiguration(getCurrentAdapterName(), getConfigurationForAdatper());
            this.registerTestModelListeners();
            this.refrehTestExplorer(null);
            this.discoveryTests();
        });

        if (isAutoInitializeEnabled()) {
            this.initialize();
        }
    }

    private restart(): void {
        this.isTestExplorerInitialized = false;
        TestManager.getInstance().restart(vscode.workspace.rootPath).then(() => {
            this.testService = TestManager.getInstance().getTestService();
            this.isTestExplorerInitialized = true;
            this.registerTestServiceListeners();
            this.registerTestModelListeners();
            this.refrehTestExplorer(null);
            this.discoveryTests();
        });
    }

    private discoveryTests() {
        this.testService.discoveryTests(vscode.workspace.rootPath).then((result) => {
            if (result) {
                this._onDidChangeTreeData.fire();
            }
            else {
            }
        });
    }

    private _createLaunchConfiguration(program: string, args: string, cwd: string, debuggerEventsPipeName: string) {
        let debugOptions = vscode.workspace.getConfiguration('csharp').get('unitTestDebuggingOptions');

        // Get the initial set of options from the workspace setting
        let result: any;
        if (typeof debugOptions === "object") {
            // clone the options object to avoid changing it
            result = JSON.parse(JSON.stringify(debugOptions));
        } else {
            result = {};
        }

        if (!result.type) {
            result.type = "coreclr";
        }

        // Now fill in the rest of the options
        result.name = ".NET Test Launch";
        result.request = "launch";
        result.debuggerEventsPipeName = debuggerEventsPipeName;
        result.program = program;
        result.args = args;
        result.cwd = cwd;

        return result;
    }

    private registerTestServiceListeners() {
        this.testService = TestManager.getInstance().getTestService();

        /*this.testService.onDidTestServiceStatusChanged((status) => {
            if (status == VSTestServiceStatus.Connected) {
                this.isTestExplorerInitialized = true;
                this._onDidChangeTreeData.fire();
                //this.discoveryTests();
            }
        });*/

        this.testService.onDidTestServiceDebugLaunchRequest((event) => {
            const response = event.Payload;
            const config = this._createLaunchConfiguration(response.FileName, response.Arguments, response.WorkingDirectory, null);
            vscode.commands.executeCommand('vscode.startDebug', config)
        });


    }

    private registerTestModelListeners() {
        this.testService.getModel().onDidTestChanged((test: Test) => {
            this._onDidChangeTreeData.fire();
            //this.refrehTestExplorer(null);
        });
    }

    private initialize() {
        // only allow to initialize if not initialized yet
        if (this.isTestExplorerInitialized) {
            return;
        }
        // initilize the test manager
        TestManager.initialize(this.context, vscode.workspace.rootPath).then(() => {
            this.isTestExplorerInitialized = true;
            this._onDidChangeTreeData.fire();
            this.discoveryTests();
        });

        this.registerTestServiceListeners();
        this.registerTestModelListeners();
    }

    private runTests(test: TestTreeType, debuggingEnabled: boolean = false): void {
        if (!test) {
            vscode.window.showWarningMessage("You need to select a test or a test group first.");
        }
        if (test instanceof Test) {
            this.testService.runTests([<Test>test], debuggingEnabled);
        }
        else if (test instanceof Label) {
            this.testService.runTests((<Label>test).getChildren(), debuggingEnabled);
        }
    }

    private debugTests(test: TestTreeType): void {
        vscode.window.showWarningMessage("Sorry, not implemented!.");
        return;
        /*if (!test) {
            vscode.window.showWarningMessage("You need to select a test or a test group first.");
        }
        if (test instanceof Test) {
            this.testService.debugTests([<Test>test], true);
        }
        else if (test instanceof Label) {
            this.testService.debugTests((<Label>test).getChildren(), true);
        }*/
    }

    private runAllTests() {
        if (this.isTestExplorerInitialized === false) {
            vscode.window.showWarningMessage("You must initialize the test explore first");
        }
        const tests = this.testService.getModel().getTests()
        if (tests.length == 0) {
            vscode.window.showWarningMessage("There is no test to run");
        }
        this.testService.runTests(tests);
    }

    private refrehTestExplorer(test: Test) {
        this._onDidChangeTreeData.fire(test);
    }

    private selectGroupBy() {
        this.groupByFilter.show().then(() => {
            this.refrehTestExplorer(null);
        })

    }

    private getNoTestFound() {
        const noTestFoundLabel: Label = new Label("No Test Found", TestOutcome.None, null);
        return Promise.resolve([noTestFoundLabel]);
    }

    private getTestsByOutcome() {
        if (!this.testService.getModel().getTests() || this.testService.getModel().getTests().length === 0) {
            return this.getNoTestFound();
        }

        return new Promise<Array<TestTreeType>>((resolve, reject) => {
            const outcomeArray = new Array<TestTreeType>();

            const testModel: TestModel = this.testService.getModel();

            const notRunTestsLabel: Label = new Label("Not Run Tests", TestOutcome.None, testModel.getNotRunTests());
            const failedTestsLabel: Label = new Label("Failed Tests", TestOutcome.Failed, testModel.getFailedTests());
            const passedTests: Label = new Label("Passed Tests", TestOutcome.Passed, testModel.getPassedTests());

            this.testsAdditionalData.setValue(notRunTestsLabel.getId(), { collapsibleState: vscode.TreeItemCollapsibleState.Expanded });
            this.testsAdditionalData.setValue(failedTestsLabel.getId(), { collapsibleState: vscode.TreeItemCollapsibleState.Expanded });
            this.testsAdditionalData.setValue(passedTests.getId(), { collapsibleState: vscode.TreeItemCollapsibleState.Expanded });

            // only add filters if there is children to display
            if (notRunTestsLabel.getChildrenLenght() > 0) {
                outcomeArray.push(notRunTestsLabel);
            }
            if (failedTestsLabel.getChildrenLenght() > 0) {
                outcomeArray.push(failedTestsLabel);
            }
            if (passedTests.getChildrenLenght() > 0) {
                outcomeArray.push(passedTests);
            }

            resolve(outcomeArray);

        });
    }

    private getTestExplorerNotInitialized() {
        const label: Label = new Label("Test Explorer is Not Initialized", TestOutcome.None, null);
        return Promise.resolve([label]);
    }

    private getTestsByDuration() {
        if (!this.testService.getModel().getTests() || this.testService.getModel().getTests().length === 0) {
            return this.getNoTestFound();
        }

        return new Promise<Array<TestTreeType>>((resolve, reject) => {
            const outcomeArray = new Array<TestTreeType>();

            const testModel: TestModel = this.testService.getModel();

            const notRunTestsLabel: Label = new Label("Not Run Tests", TestOutcome.None, testModel.getNotRunTests());
            const fastTestsLabel: Label = new Label("Fast < 100ms", TestOutcome.None, testModel.getFastTests());
            const mediumTestsLabel: Label = new Label("Medium >= 100ms", TestOutcome.Failed, testModel.getMediumTests());
            const slowTests: Label = new Label("Slow > 1sec", TestOutcome.Passed, testModel.getSlowTests());

            this.testsAdditionalData.setValue(notRunTestsLabel.getId(), { collapsibleState: vscode.TreeItemCollapsibleState.Expanded });
            this.testsAdditionalData.setValue(fastTestsLabel.getId(), { collapsibleState: vscode.TreeItemCollapsibleState.Expanded });
            this.testsAdditionalData.setValue(mediumTestsLabel.getId(), { collapsibleState: vscode.TreeItemCollapsibleState.Expanded });
            this.testsAdditionalData.setValue(slowTests.getId(), { collapsibleState: vscode.TreeItemCollapsibleState.Expanded });

            // only add filters if there is children to display
            if (notRunTestsLabel.getChildrenLenght() > 0) {
                outcomeArray.push(notRunTestsLabel);
            }
            if (fastTestsLabel.getChildrenLenght() > 0) {
                outcomeArray.push(fastTestsLabel);
            }
            if (mediumTestsLabel.getChildrenLenght() > 0) {
                outcomeArray.push(mediumTestsLabel);
            }
            if (slowTests.getChildrenLenght() > 0) {
                outcomeArray.push(slowTests);
            }

            resolve(outcomeArray);

        });
    }


    getChildren(test?: TestTreeType): Thenable<TestTreeType[]> {
        if (this.isTestExplorerInitialized === false) {
            return this.getTestExplorerNotInitialized();
        }
        if (test) {
            return Promise.resolve(test.getChildren() ? test.getChildren() : []);
        }
        else {
            switch (this.groupByFilter.getSelected().type) {
                case GroupByQuickPickItemType.Class:
                    break;
                case GroupByQuickPickItemType.Outcome:
                    return this.getTestsByOutcome();
                case GroupByQuickPickItemType.Duration:
                    return this.getTestsByDuration();
            }
        }
    }

    getTreeItem(item: TestTreeType): vscode.TreeItem {
        return <vscode.TreeItem>{
            label: this.getLabel(item),
            collapsibleState: this.getItemCollapsibleState(item),
            command: {
                command: "vstest.explorer.open",
                arguments: [item],
                title: this.getLabel(item),
            },
            iconPath: this.getIcon(item)
        };
    }

    private getLabel(testCase: TestTreeType): string {
        return testCase.getDisplayName();
    }

    private getIcon(item: TestTreeType) {
        if (item instanceof Label) {
            return null;
        }

        if (item instanceof Test) {
            if (item.isRunning) {
                return Utils.getImageResource("progress.svg");
            }
            let appendStringIcon = "";
            if (item.getResult() && item.getResult().sessionId != this.testService.getModel().getRunTestSessionId()) {
                appendStringIcon = "_previousExec";
            }
            const outcome = item.getResult() ? item.getResult().outcome : TestOutcome.None;
            switch (outcome) {
                case TestOutcome.Failed:
                    return Utils.getImageResource(`error${appendStringIcon}.svg`);
                case TestOutcome.None:
                    return Utils.getImageResource(`exclamation${appendStringIcon}.svg`);
                case TestOutcome.NotFound:
                    return Utils.getImageResource("interrogation.svg");
                case TestOutcome.Passed:
                    return Utils.getImageResource(`checked${appendStringIcon}.svg`);
                case TestOutcome.Skipped:
                    return Utils.getImageResource(`skipped${appendStringIcon}.svg`);
            }
        }
        return Utils.getImageResource("interrogation.svg");
    }

    private getItemCollapsibleState(item: TestTreeType) {
        const treeItemAdditionalInfo: TestAdditionalData = this.testsAdditionalData.getValue(item.getId());
        if (treeItemAdditionalInfo) {
            return treeItemAdditionalInfo.collapsibleState;
        }
        const hasChildren: boolean = item.getChildren() ? item.getChildren().length > 0 : false;
        const collapsibleState: vscode.TreeItemCollapsibleState = hasChildren ? vscode.TreeItemCollapsibleState.Collapsed : null;
        return collapsibleState;
    }

    private toggleItemCollapsibleState(test: TestTreeType) {
        const treeItemAdditionalInfo: TestAdditionalData = this.testsAdditionalData.getValue(test.getId());
        if (!treeItemAdditionalInfo) {
            return;
        }

        switch (treeItemAdditionalInfo.collapsibleState) {
            case vscode.TreeItemCollapsibleState.None:
                break;
            case vscode.TreeItemCollapsibleState.Collapsed:
                treeItemAdditionalInfo.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
                break;
            case vscode.TreeItemCollapsibleState.Expanded:
                treeItemAdditionalInfo.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
                break;
        }
    }

    private goToTestLocation(item: TestTreeType) {
        this.toggleItemCollapsibleState(item);
        this.selectedItem = item;

        if (item instanceof Test) {

            const uri: string = item.getCodeFilePath();
            vscode.workspace.openTextDocument(uri).then(result => {
                vscode.window.showTextDocument(result);
                const editor = vscode.window.activeTextEditor;

                //decrement 1 here because vscode is 0 base line index
                const range = editor.document.lineAt(item.getLineNumber() - 1).range;
                editor.selection = new vscode.Selection(range.start, range.start);
                editor.revealRange(range);
            });
        }
    }

    private showTestResult(item: TestTreeType) {
        if (item instanceof Test) {
            if (!item.getResult()) {
                return;
            }

            const result = item.getResult();

            const testOutputChannel = TestManager.getInstance().testOutputChannel;

            testOutputChannel.appendData(item.getDisplayName());
            testOutputChannel.appendData(`Duration: ${result.duration}`);
            testOutputChannel.appendData(`Start Time: ${result.startTime}`);
            testOutputChannel.appendData(`End Time: ${result.endTime}`);

            if (result.outcome == TestOutcome.Failed) {
                testOutputChannel.appendData(`Error: ${result.errorMessage}`);
                testOutputChannel.appendData(`Stack Trace: ${result.errorStackTrace}`);
            }
        }
    }
}