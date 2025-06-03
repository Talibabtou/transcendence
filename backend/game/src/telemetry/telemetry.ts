import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { initializeMetrics } from './metrics.js';
import fastifyOtel from '@fastify/otel';

const { FastifyOtelInstrumentation } = fastifyOtel;

const prometheusExporter = new PrometheusExporter({
  port: parseInt(process.env.OTEL_EXPORTER_PORT || '9464', 10)
});

const resource = new Resource({
  [ATTR_SERVICE_NAME]: 'game-service',
  [ATTR_SERVICE_VERSION]: '1.0.0',
});

const sdk = new NodeSDK({
  resource: resource,
  metricReader: prometheusExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
    }),
    new FastifyOtelInstrumentation({ registerOnInitialization: true }),
  ],
});

export async function startTelemetry() {
  try {
    await sdk.start();
    initializeMetrics();
    process.on('SIGTERM', async () => {
      try {
        await sdk.shutdown();
      } catch (err) {
				process.exit(1);
      } finally {
        process.exit(0);
      }
    });
  } catch (err) {
    process.exit(1);
  }
}
