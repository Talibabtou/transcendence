# Stage 1: Build and test
FROM node:23.6-alpine AS build

ARG GATEWAY_PORT
ENV PORT=${GATEWAY_PORT}

WORKDIR /app
COPY package.json ./
COPY tsconfig.json ./
RUN npm install
RUN npm ci

COPY ./src/ /app/src/
RUN npm run build

# Stage 2: Production
FROM node:23.6-alpine AS production

RUN apk add --no-cache curl

WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE ${PORT}
CMD ["node", "dist/server.js"]
