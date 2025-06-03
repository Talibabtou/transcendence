# Stage 1: Builder
FROM alpine:3.19 AS build

# Install gettext for envsubst
RUN apk update && apk add --no-cache gettext

# Declare build argument for Prometheus port
ARG PROMETHEUS_PORT

# Copy the template
COPY datasources.yaml.template /tmp/datasources.yaml.template
RUN mkdir -p /processed
# Process the template
# Ensure PROMETHEUS_PORT is exported for envsubst to pick it up
RUN export PROMETHEUS_PORT=${PROMETHEUS_PORT} && \
    mkdir -p /processed/etc/grafana/provisioning/datasources && \
    envsubst '\$PROMETHEUS_PORT' < /tmp/datasources.yaml.template > /processed/etc/grafana/provisioning/datasources/datasources.yaml

# Stage 2: Final image
FROM grafana/grafana:10.3.1

# Copy the processed configuration from the builder stage
COPY --from=build /processed/etc/grafana/provisioning/datasources/datasources.yaml /etc/grafana/provisioning/datasources/datasources.yaml

# Grafana's original CMD and ENTRYPOINT will be used
# No need for custom entrypoint.sh anymore