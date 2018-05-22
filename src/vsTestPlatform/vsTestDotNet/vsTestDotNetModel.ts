import { TestModel } from "../vsTest/vsTestModel";
import { IVSTestConfig } from "../vsTest/vsTestConfig";
import { GlobSync } from "glob"
import * as path from "path"

export class VSTestDotNetModel extends TestModel {

    constructor(config: IVSTestConfig) {
        super(config);
        //if (!config) {
        //this.config = {
        //    "glob": "**/*Tests.dll", 
        //    framework: ".NETCoreApp,Version=v1.0"
        //}
        //}
    }

    private translateTestFramework() {
        switch (this.config.framework) {
            case "netcoreapp1.0":
                return ".NETCoreApp,Version=v1.0";
            case "netcoreapp1.1":
                return ".NETCoreApp,Version=v1.1";
            case "netcoreapp2.0":
                return ".NETCoreApp,Version=v2.0";
            case "Framework35":
                return "Framework35";
            case "Framework40":
                return "[Framework40]";
            case "Framework45":
                return "Framework45";
            case "net46":
                return ".NETFramework,Version=v4.6";
            default:
                return this.config.framework;
        }
    }

    public getRunSettings() {
        const framework = this.translateTestFramework();
        return `<RunSettings><RunConfiguration><TargetFrameworkVersion>${framework}</TargetFrameworkVersion></RunConfiguration></RunSettings>`;
    }

    public getAdditionalTestAdapters(workspace: string): Array<string> {
        const globPattern = path.join(workspace, this.config.output, "**", "**.TestAdapter.dll");
        const files = new GlobSync(globPattern, { matchBase: true }).found;
        return files;
    }
}