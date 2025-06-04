# Stage 1: Builder
FROM alpine:3.19 AS build

# Install gettext for envsubst and apache2-utils for htpasswd (bcrypt)
RUN apk update && apk add --no-cache gettext coreutils apache2-utils

# Declare build arguments
ARG PROMETHEUS_PORT
ARG OTEL_EXPORTER_PORT
ARG PROMETHEUS_ADMIN_USER
ARG PROMETHEUS_ADMIN_PASSWORD

# Copy the templates
COPY prometheus.yml.template /tmp/prometheus.yml.template
COPY alert.rules.yml /tmp/alert.rules.yml
COPY web-config.yml /tmp/web-config.yml
RUN mkdir -p /processed

# Process the templates
RUN export PROMETHEUS_PORT=${PROMETHEUS_PORT} && \
    export OTEL_EXPORTER_PORT=${OTEL_EXPORTER_PORT} && \
    export PROMETHEUS_ADMIN_USER=${PROMETHEUS_ADMIN_USER} && \
    export PROMETHEUS_ADMIN_PASSWORD=${PROMETHEUS_ADMIN_PASSWORD} && \
    PROMETHEUS_ADMIN_PASSWORD_HASHED=$(htpasswd -nbB "${PROMETHEUS_ADMIN_USER}" "${PROMETHEUS_ADMIN_PASSWORD}" | cut -d':' -f2-) && \
    export PROMETHEUS_ADMIN_PASSWORD_HASHED=${PROMETHEUS_ADMIN_PASSWORD_HASHED} && \
    envsubst '\$OTEL_EXPORTER_PORT \$PROMETHEUS_PORT \$PROMETHEUS_ADMIN_USER \$PROMETHEUS_ADMIN_PASSWORD' < /tmp/prometheus.yml.template > /processed/prometheus.yml && \
    envsubst '\$PROMETHEUS_ADMIN_USER \$PROMETHEUS_ADMIN_PASSWORD_HASHED' < /tmp/web-config.yml > /processed/web-config.yml

# Stage 2: Final image
FROM prom/prometheus:v3.2.0

# Copy the processed configuration from the builder stage
COPY --from=build /processed/prometheus.yml /etc/prometheus/prometheus.yml
COPY --from=build /tmp/alert.rules.yml /etc/prometheus/alert.rules.yml
COPY --from=build /processed/web-config.yml /etc/prometheus/web-config.yml