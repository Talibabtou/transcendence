import { readFileSync } from 'node:fs'
import { join } from 'node:path' //not use curly braces for default exports
import fastify from 'fastify'

const server = fastify({
	http2: true,
  https: {
    key: readFileSync(join(process.cwd(), './certs/key.pem')),
    cert: readFileSync(join(process.cwd(), './certs/cert.pem'))
  }
})

server.get('/', async function (request, reply) {
  return { hello: 'world' }
})

server.listen({ port: 8080 }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(0)
  }
  console.log(`Server listening at ${address}`)
})