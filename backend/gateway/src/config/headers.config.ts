import { FastifyReply, FastifyRequest } from 'fastify';

export async function addHeaders(request: FastifyRequest, reply: FastifyReply) {
  reply.header(
    'Permissions-Policy',
    'geolocation=(), camera=(), microphone=(), fullscreen=(self), payment=(), usb=()'
  );
  reply.header('Cache-Control', 'no-store');
  reply.header('Vary', 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
}

export async function blockHeaders(request: FastifyRequest, reply: FastifyReply) {
  const forbiddenMethods = ['TRACE', 'TRACK', 'CONNECT'];
  if (forbiddenMethods.includes(request.raw.method || '')) reply.code(405).send({ error: 'Method Not Allowed' });
}
