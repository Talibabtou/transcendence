import fs from 'node:fs';
export async function getPic(request, reply) {
    try {
        return reply.code(200).send({ message: "get Pic reached 200" });
    }
    catch (err) {
        return reply.code(500).send({ message: "get Pic reached 400" });
    }
}
export async function deletePic(request, reply) {
    try {
        return reply.code(204).send({ message: "delete Pic reached 200" });
    }
    catch (err) {
        return reply.code(500).send({ message: "delete Pic reached 400" });
    }
}
export async function upload(request, reply) {
    try {
        const file = await request.file();
        if (!file) {
            return reply.code(404).send({ error: "No file provided" });
        }
        const uploadDir = './uploads';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        const ext = file.filename.substring(file.filename.lastIndexOf('.'));
        const filePath = `${uploadDir}/${request.user.id}${ext}`;
        fs.readdirSync(uploadDir).forEach(file => {
            if (file.match(new RegExp(`^${request.user.id}(\\..*)?$`)))
                fs.unlinkSync(`${uploadDir}/${file}`);
        });
        fs.promises.writeFile(filePath, await file.toBuffer());
        return reply.code(201).send({ message: "File uploaded successfully" });
    }
    catch (err) {
        return reply.code(500).send({ error: err.message });
    }
}
