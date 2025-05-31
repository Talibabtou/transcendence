FROM node:23.6-alpine AS build

WORKDIR /app

COPY package.json ./
COPY tsconfig.json ./
RUN npm install
RUN npm ci

COPY ./src/ /app/src/
RUN npm run build

FROM node:23.6-alpine AS production

ARG AUTH_PORT
ARG OTEL_EXPORTER_PORT

WORKDIR /app
RUN mkdir /app/db/
COPY ./init/ /app/init/
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://auth:${AUTH_PORT}/health').then(r => r.status === 200 ? process.exit(0) : process.exit(1))"

EXPOSE ${AUTH_PORT}
EXPOSE ${OTEL_EXPORTER_PORT}
CMD ["node", "dist/server.js"]