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

import cp = require("child_process");
import { TPromise } from "./base/common/winjs.base";
import Event, { Emitter } from "./base/common/Event";
import net = require("net");
import stream = require("stream");
import { BinaryReader } from "./binary/binaryReader";
import { BinaryWriter } from "./binary/binaryWriter";


export interface IAdapterExecutable {
    command?: string;
    args?: string[];
}

export abstract class RawProtocolSession {
    private serverProcess: cp.ChildProcess;
    public disconnected: boolean;
    private cachedInitServer: TPromise<void>;
    private startTime: number;
    protected socket: net.Socket = null;

    private outputStream: stream.Writable;
    private rawData: Buffer;

    private stdServer: net.Server;

    private binaryReader: BinaryReader;

    constructor() {
        this.rawData = new Buffer(0);
        this.binaryReader = new BinaryReader();
    }

    protected createSocketServer(port: number) {
        // Begin listening to stderr pipe
        this.stdServer = net.createServer((socket) => {
            this.socket = socket;
            this.socket.on('data', (data) => {
                this.binaryReader.append(data);
                do {
                    var msg = this.binaryReader.ReadString();

                    if (msg && msg.toString() !== "") {
                        this.dispatch(msg.toString());
                    }
                } while (msg);
            });
        });
        this.stdServer.listen(port);
    }

    protected abstract onProtocolMessage(message: VSTestProtocol.ProtocolMessage): void;

    protected abstract onEvent({ event, message });

    private dispatch(body: string): void {
        try {
            const rawData = <VSTestProtocol.ProtocolMessage>JSON.parse(body);
            this.onProtocolMessage(rawData);
        } catch (e) {
            this.onServerError(new Error(e.message || e));
            console.log(e);
        }
    }

    protected connect(readable: stream.Readable, writable: stream.Writable): void {

        this.outputStream = writable;

        readable.on('data', (data: Buffer) => {
            this.rawData = Buffer.concat([this.rawData, data]);
            console.log(data.toString());
        });
    }


    protected onServerError(err: Error): void {
        // this.messageService.show(severity.Error, nls.localize("stoppingDebugAdapter", "{0}. Stopping the debug adapter.", err.message));
        this.stopServer().done(null/*, errors.onUnexpectedError*/);

        console.log("onServerError");
    }

    private onServerExit(): void {
        this.serverProcess = null;
        this.cachedInitServer = null;
        let message: string = "Server Disconnected";
        if (!this.disconnected) {
            // this.messageService.show(severity.Error, nls.localize("debugAdapterCrash", "Debug adapter process has terminated unexpectedly"));
            message = "Error: VSTest server crashed";
        }
        this.onEvent({ event: "exit", message: message });

        console.log("onServerExit");
    }

    public stopServer(): TPromise<any> {

        if (this.socket !== null) {
            this.socket.end();
            this.cachedInitServer = null;
        }



        //this.onEvent({ event: "exit", type: "event", seq: 0 });
        if (!this.serverProcess) {
            return TPromise.as(null);
        }

        this.disconnected = true;

        let ret: TPromise<void>;
        // when killing a process in windows its child
        // processes are *not* killed but become root
        // processes. Therefore we use TASKKILL.EXE
        // FIXME: add platform check  
        if (/*platform.isWindows*/false) {
            ret = new TPromise<void>((c, e) => {
                const killer = cp.exec(`taskkill /F /T /PID ${this.serverProcess.pid}`, function (err, stdout, stderr) {
                    if (err) {
                        return e(err);
                    }
                });
                killer.on("exit", () => {
                    this.stdServer.close(c);
                });
                killer.on("error", e);
            });
        } else {
			this.serverProcess.kill("SIGTERM");
			ret = TPromise.as(null);
		}

        return ret;
    }

    protected launchServer(launch: IAdapterExecutable, port: number, cwd): TPromise<void> {
        this.createSocketServer(port);

        return new TPromise<void>((complete, e) => {
            this.serverProcess = cp.spawn(launch.command, launch.args, {
                stdio: [
                    "pipe", 	// stdin
                    "pipe", 	// stdout
                    "pipe"		// stderr
                ],
                cwd: cwd
            });

            this.serverProcess.on("error", (err: Error) => this.onServerError(err));
            this.serverProcess.on("exit", (code: number, signal: string) => {
                this.onServerExit();
            });
            this.serverProcess.stderr.on("data", (data: string) => {
                console.log(data.toString());
            });
            this.connect(this.serverProcess.stdout, this.serverProcess.stdin);

            complete(null);
        });
    }

    protected sendProtocolMessage(message: VSTestProtocol.ProtocolMessage) {
        var stringifyMessage = JSON.stringify(message);
        var writer = new BinaryWriter();
        //stringifyMessage = '{\"MessageType\":\"TestDiscovery.Start\",\"Payload\":{\"Sources\":[\"C:\\\\Users\\\\gfrancischini\\\\Desktop\\\\vstest-rel-15.3-rtm\\\\test\\\\testhost.UnitTests\\\\bin\\\\Debug\\\\netcoreapp1.0\\\\testhost.UnitTests.dll\"],\"RunSettings\":null}}';

        writer.WriteString(stringifyMessage);
        //writer.WriteUInt8(stringifyMessage.length);
        //writer.WriteBytes(stringifyMessage);
        this.socket.write(writer.byteBuffer);
    }
}