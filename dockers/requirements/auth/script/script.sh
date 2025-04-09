#!/bin/bash

npm install @types/node typescript fastify fastify-sqlite-typed zod @types/node-fetch@2
npm run build

exec "$@"