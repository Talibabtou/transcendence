# Stage 1: Build and test
FROM node:23.6-alpine AS build

WORKDIR /app
COPY ./backend/profile/package.json ./
COPY ./backend/profile/tsconfig.json ./
RUN npm install
RUN npm ci

COPY ./shared /app/src/shared
COPY ./backend/profile/src/ /app/src/
RUN npm run build

# Stage 2: Production
FROM node:23.6-alpine AS production

ARG PROFILE_PORT
ARG OTEL_EXPORTER_PORT

WORKDIR /app
RUN mkdir -p /app/uploads/
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src/shared /app/src/shared
COPY ./backend/profile/package*.json ./

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://profile:${PROFILE_PORT}/health').then(r => r.status === 200 ? process.exit(0) : process.exit(1))"

EXPOSE ${PROFILE_PORT}
EXPOSE ${OTEL_EXPORTER_PORT}
CMD ["node", "dist/server.js"]
