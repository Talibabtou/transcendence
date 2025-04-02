import { FastifyRequest, FastifyReply } from 'fastify'

declare module 'fastify' {
  interface FastifyJWT {
    user: {
      id: string;
      username: string;
      role: string | object | Buffer<ArrayBufferLike>;
    };
  }
}

function verifTypeFile(file: any) {
  const allowedExt: string[] = [ '.jpg', '.jpeg', '.png' ];
  const allowedMimeTypes: string[] = [ 'image/png', 'image/jpeg' ];
  const ext: string = file.filename.substring(file.filename.lastIndexOf('.')).toLowerCase();
  if (!allowedMimeTypes.includes(file.mimetype) || !allowedExt.includes(ext)) {
    return { valid: false, error: "Invalid file type or extension" };
  }
  return { valid: true };
}

export async function upload(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
      const subpath: string = request.url.split('/profil')[1];
      const serviceUrl: string = `http://localhost:8081${subpath}`;
      const file: any = await request.file();
      if (!file) {
        request.server.log.error("No file provided");
        return reply.code(404).send({
          success: false,
          message: "No file provided"
        });
      }
      const verif: any = verifTypeFile(file);
      if (verif.valid === false) {
        request.server.log.error("Invalid file type or extension");
        return reply.code(403).send({
          success: false,
          message: "Invalid file type or extension"
        });
      }
      const buffer: Buffer = await file.toBuffer();
      const formData: FormData = new FormData();
      formData.append('file', new Blob([buffer]), file.filename);
      const response: Response = await fetch(serviceUrl, {
        method: 'POST',
        headers: {
          'Authorization': request.headers.authorization || 'no token'
        },
        body: formData
      });
      const responseData: any = await response.json();
      request.server.log.info(`Uploading file: ${file.filename}, size: ${file.fileSize}, mimetype: ${file.mimetype}`);
      return reply.code(response.status).send(responseData);
    } catch (err: any) {
        request.server.log.error("Internal server error", err);
        return reply.code(500).send({
          success: false,
          message: err.message
        });
  }
}

export async function deletePic(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const subpath: string = request.url.split('/profil')[1];
    const serviceUrl: string = `http://localhost:8081${subpath}`;
    const response: Response = await fetch(serviceUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': request.headers.authorization || 'no token'
      },
    });
    if (response.status == 204){
      request.server.log.info("Request DELETE successfully treated");
      return reply.code(response.status).send();
    }
    const responseData: any = await response.json();
    request.server.log.error("Request DELETE failled");
    return reply.code(response.status).send({
      success: response.status < 400,
      message: "Request DELETE failled",
      data: {
        data: responseData
      }
    });
  } catch (err: any) {
    request.server.log.error("Internal server error", err);
    return reply.code(500).send({
      success: false,
      message: err.message
    });
  }
}