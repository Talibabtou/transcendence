import fs from 'node:fs'
import path from 'node:path' //not use curly braces for default exports
import { fileURLToPath } from 'node:url' //curly braces {} for named exports
import fastify from 'fastify'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const server = fastify({
	http2: true,
  https: {
    key: fs.readFileSync(path.join(__dirname, '../certs/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../certs/cert.pem'))
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