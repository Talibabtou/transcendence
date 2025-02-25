#!/bin/bash

if [ ! -f "/usr/bin/api_gateway/https/cert.pem" ]; then
    openssl genrsa -out /usr/bin/api_gateway/https/key.pem
    openssl req -new -key /usr/bin/api_gateway/https/key.pem \
        -out /usr/bin/api_gateway/https/csr.pem \
        -subj "/C=FR/ST=R/L=Lyon/O=42/OU=42/CN=42"
    openssl x509 -req -days 9999 \
        -in /usr/bin/api_gateway/https/csr.pem \
        -signkey /usr/bin/api_gateway/https/key.pem \
        -out /usr/bin/api_gateway/https/cert.pem
fi

npm install @types/node typescript fastify \
    fastify-sqlite-typed zod @types/node-fetch@2
npm run build

exec "$@"