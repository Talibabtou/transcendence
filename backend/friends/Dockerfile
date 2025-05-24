# Stage 1: Build and test
FROM node:23.6-alpine AS build

WORKDIR /app
COPY package.json ./
COPY tsconfig.json ./
RUN npm install
RUN npm ci

COPY ./src/ /app/src/
RUN npm run build

# Stage 2: Production
FROM node:23.6-alpine AS production

WORKDIR /app
RUN mkdir /app/db/
COPY ./init/ /app/init/
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://friends:8084/health').then(r => r.status === 200 ? process.exit(0) : process.exit(1))"

EXPOSE 8084
CMD ["node", "dist/server.js"]
