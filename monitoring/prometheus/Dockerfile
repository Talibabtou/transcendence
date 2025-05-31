# Stage 1: Builder
FROM alpine:3.19 AS build

# Install gettext for envsubst
RUN apk update && apk add --no-cache gettext

# Declare build arguments
ARG PROMETHEUS_PORT
ARG OTEL_EXPORTER_PORT

# Copy the template
COPY prometheus.yml.template /tmp/prometheus.yml.template
RUN mkdir -p /processed
# Process the template
RUN export PROMETHEUS_PORT=${PROMETHEUS_PORT} && \
    export OTEL_EXPORTER_PORT=${OTEL_EXPORTER_PORT} && \
    envsubst '\$OTEL_EXPORTER_PORT \$PROMETHEUS_PORT' < /tmp/prometheus.yml.template > /processed/prometheus.yml

# Stage 2: Final image
FROM prom/prometheus:v3.2.0

# Copy the processed configuration from the builder stage
COPY --from=build /processed/prometheus.yml /etc/prometheus/prometheus.yml
