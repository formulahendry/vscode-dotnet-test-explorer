/*
MIT License

Copyright (c) 2017 Gabriel Parelli Francischini

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

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