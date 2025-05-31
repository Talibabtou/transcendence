# syntax=docker/dockerfile:1.4

# Stage 1: Build
FROM node:23.11.1 AS build

ARG HTTPS_PORT
ARG HTTP_PORT
ARG GATEWAY_PORT

WORKDIR /code
COPY package.json /code

# Install dependencies and gettext for envsubst
RUN yarn install && \
    apt-get update && apt-get install -y gettext

# Copy the rest of the application code
COPY src/ /code/src/
COPY tsconfig.json /code/tsconfig.json
COPY vite.config.ts /code/vite.config.ts

# Substitute environment variables in TypeScript files
# Note: We need to be careful with paths and ensure envsubst operates on the correct files.
RUN find /code/src/website/scripts -type f -name '*.ts' -exec sh -c \
    'envsubst "\$HTTPS_PORT" < "$1" > "$1.tmp" && mv "$1.tmp" "$1"' sh {} \;

# Build the application
RUN yarn vite build

# Stage 2: Production
FROM nginx:stable-alpine AS production

ARG HTTPS_PORT
ARG HTTP_PORT
ARG GATEWAY_PORT # Ensure GATEWAY_PORT is available in this stage

# Install gettext for envsubst
RUN apk add --no-cache gettext
COPY ./errors /usr/share/nginx/html/errors
# Copy built assets from the build stage
COPY --from=build /code/dist/website /usr/share/nginx/html

# Copy custom Nginx configuration template
COPY nginx.conf /etc/nginx/nginx.conf.template

# Substitute variables in nginx.conf and set it up
RUN envsubst '\$HTTPS_PORT \$GATEWAY_PORT' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf

# Expose the port Nginx will listen on
EXPOSE ${HTTPS_PORT}
EXPOSE ${HTTP_PORT}

# Nginx will be started by its default CMD, but we ensure it runs in the foreground
CMD ["nginx", "-g", "daemon off;"]