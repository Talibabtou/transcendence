export async function addHeaders(request, reply) {
    reply.header('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), fullscreen=(self), payment=(), usb=()');
    reply.header('Cache-Control', 'no-store');
    reply.header('Vary', 'Origin');
}
export async function blockHeaders(request, reply) {
    const forbiddenMethods = ['TRACE', 'TRACK', 'CONNECT', 'PUT'];
    if (forbiddenMethods.includes(request.raw.method || '')) {
        reply.code(405).send({ error: 'Method Not Allowed' });
    }
}
