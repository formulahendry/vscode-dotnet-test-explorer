import * as net from "net";

export interface ILocalServer {
    server: net.Server;
    port: number;
    openConnections: ReadonlySet<net.Socket>
}

export async function readAllFromSocket(socket: net.Socket) {
    return new Promise<string>((resolve, reject) => {
        const allData = [];
        socket.on('data', (data) => allData.push(data))
        socket.on('end', () => {
            resolve(allData.join(""));
        });
        socket.on('error', reject);
        socket.on('timeout', reject);
    });
}

export async function createLocalTcpServer(accept: (socket: net.Socket) => void):
    Promise<ILocalServer> {
    return new Promise((resolve, reject) => {
        const openConnections = new Set<net.Socket>();
        const server = net.createServer((socket) => {
            openConnections.add(socket);
            socket.on("close", () => openConnections.delete(socket));
            socket.on("error", () => openConnections.delete(socket));
            socket.on("timeout", () => openConnections.delete(socket));
            accept(socket);
        })
            .on("error", reject);
        server.listen(0, "localhost", () => {
            const address = server.address();
            if (typeof address === "string") {
                throw new Error();
            }
            resolve({ server, port: address.port, openConnections });
        });
    });
}

export async function shutdown(server: ILocalServer) {
    server.server.unref();
    server.server.close();

    for (const socket of [...server.openConnections]) {
        socket.destroy();
    }
}
