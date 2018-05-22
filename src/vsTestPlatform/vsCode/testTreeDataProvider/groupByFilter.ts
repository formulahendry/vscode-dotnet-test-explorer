import * as vscode from "vscode";

export enum GroupByQuickPickItemType {
    Duration,
    Outcome,
    Class,
}

class GroupByQuickPickItem implements vscode.QuickPickItem {
    type: GroupByQuickPickItemType;
    /**
	* A human readable string which is rendered prominent.
	*/
    label: string;

    /**
     * A human readable string which is rendered less prominent.
     */
    description: string;

    /**
     * A human readable string which is rendered less prominent.
     */
    detail?: string;

    constructor(type, label, description, detail?) {
        this.type = type;
        this.label = label;
        this.description = description;
        this.detail = detail;
    }
}

export class GroupByFilter {
    private items: Array<GroupByQuickPickItem> = new Array<GroupByQuickPickItem>();

    private selected: GroupByQuickPickItem;

    constructor() {
        const groupByOutcome = new GroupByQuickPickItem(GroupByQuickPickItemType.Outcome, "Outcome", "Groups tests by execution results: Failed Tests, Skipped Tests, Passed Tests.")
        this.items.push(groupByOutcome);
        this.items.push(new GroupByQuickPickItem(GroupByQuickPickItemType.Duration, "Duration", "Groups test by execution time: Fast, Medium, and Slow."));
        this.items.push(new GroupByQuickPickItem(GroupByQuickPickItemType.Class, "Class", "Groups tests by method class"));

        this.selected = groupByOutcome;
    }

    getQuickPickOptions(): vscode.QuickPickOptions {
        return { placeHolder: "Select how you would like to group you test files" };
    }

    show(): Promise<GroupByQuickPickItem> {

        return new Promise<GroupByQuickPickItem>((resolve, reject) => {
            vscode.window.showQuickPick<GroupByQuickPickItem>(this.items, this.getQuickPickOptions()).then((value: GroupByQuickPickItem) => {
                if (value != null) {
                    this.selected = value;
                }
                return resolve(this.selected);
            });
        });
    }

    getSelected(): GroupByQuickPickItem {
        return this.selected;
    }

}