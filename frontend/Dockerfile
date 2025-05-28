# syntax=docker/dockerfile:1.4

# Stage 1: Build
FROM node:23.11.1 AS build

WORKDIR /code
COPY package.json /code


# Install dependencies
RUN yarn install

# Copy the rest of the application code
COPY src/ /code/src/
COPY tsconfig.json /code/tsconfig.json
COPY vite.config.ts /code/vite.config.ts

# Build the application
RUN yarn vite build

# Stage 2: Production
FROM nginx:stable-alpine AS production

# Copy built assets from the build stage
COPY --from=build /code/dist/website /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose the port Nginx will listen on
EXPOSE 443
EXPOSE 80

# Nginx will be started by its default CMD, but we ensure it runs in the foreground
CMD ["nginx", "-g", "daemon off;"]