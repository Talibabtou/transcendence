# Stage 1: Build and test
FROM node:23.6-alpine AS build

WORKDIR /app
COPY ./backend/gateway/package.json ./
COPY ./backend/gateway/tsconfig.json ./
RUN npm install
RUN npm ci

COPY ./shared /app/src/shared
COPY ./backend/gateway/src/ /app/src/
RUN npm run build

# Stage 2: Production
FROM node:23.6-alpine AS production

ARG GATEWAY_PORT
ARG OTEL_EXPORTER_PORT

RUN apk add --no-cache curl

WORKDIR /app
RUN mkdir -p uploads
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src/shared /app/src/shared
COPY ./backend/gateway/package*.json ./

EXPOSE ${GATEWAY_PORT}
EXPOSE ${OTEL_EXPORTER_PORT}
CMD ["node", "dist/server.js"]
