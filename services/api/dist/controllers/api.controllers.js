import fs from "node:fs";
import path from "path";
export async function getPic(request, reply) {
    const id = request.params.id;
    const uploadDir = path.join(path.resolve(), "./srcs/shared/uploads");
    const existingFile = fs
        .readdirSync(uploadDir)
        .find((file) => file.startsWith(id));
    if (existingFile) {
        request.server.log.info(`Picture ${existingFile} found`);
        return reply.code(200).send({
            success: true,
            message: `Picture ${existingFile} found`,
            data: {
                dir: '/uploads',
                image: existingFile
            },
        });
    }
    else {
        request.server.log.error("Picture not found");
        return reply.code(404).send({
            success: false,
            message: "Picture not found",
        });
    }
}
export async function getPics(request, reply) {
    const uploadDir = path.join(path.resolve(), "./srcs/shared/uploads");
    const existingFiles = fs
        .readdirSync(uploadDir);
    if (existingFiles) {
        request.server.log.info(`Pictures found`);
        return reply.code(200).send({
            success: true,
            message: 'Pictures found',
            data: {
                dir: '/uploads',
                images: existingFiles
            },
        });
    }
    else {
        request.server.log.error("Pictures not found");
        return reply.code(404).send({
            success: false,
            message: "Pictures not found",
        });
    }
}
export async function webSocket(ws, request) {
    try {
        ws.on('message', (message) => {
            const { serviceName, type, date } = JSON.parse(message);
            if (type === 'heartbeat') {
                console.log({
                    serviceName: serviceName,
                    message: 'Message received',
                    date: date
                });
            }
            else {
                console.log({
                    serviceName: serviceName,
                    message: 'Message received',
                    date: date
                });
            }
            ws.on('close', (message) => {
                const { serviceName, type, date } = JSON.parse(message);
                console.log({
                    serviceName: serviceName,
                    message: 'Disconnected',
                    date: date
                });
            });
        });
    }
    catch (err) {
        console.error({
            error: err.message
        });
    }
}
