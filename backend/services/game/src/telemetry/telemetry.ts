import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'
import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { Resource } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { metrics } from '@opentelemetry/api'
import { initializeMetrics } from './metrics.js' // Import the initializer
// Import the Fastify instrumentation using default import for CommonJS compatibility
import fastifyOtel from '@fastify/otel'
const { FastifyOtelInstrumentation } = fastifyOtel

// Configure the Prometheus Exporter
// Default port is 9464
const prometheusExporter = new PrometheusExporter({
  // You might want to make the port configurable via environment variables
  // port: parseInt(process.env.OTEL_EXPORTER_PROMETHEUS_PORT || '9464', 10)
})

// Define the resource for the service
const resource = new Resource({
  [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'game-service',
  [ATTR_SERVICE_VERSION]: process.env.SERVICE_VERSION || '1.0.0'
})

// Configure the trace exporter (pointing to Tempo)
const traceExporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces' // Tempo OTLP endpoint
})

// Configure the NodeSDK
const sdk = new NodeSDK({
  resource: resource,
  metricReader: prometheusExporter,
  spanProcessor: new BatchSpanProcessor(traceExporter),
  instrumentations: [
    // getNodeAutoInstrumentations will include http by default
    getNodeAutoInstrumentations({
      // '@opentelemetry/instrumentation-http': { enabled: true } // Let FastifyInstrumentation handle specific HTTP parts
    }),
    // Add Fastify instrumentation
    // The 'registerOnInitialization' option avoids needing to manually register the plugin in Fastify
    new FastifyOtelInstrumentation({ registerOnInitialization: true })
  ]
  // The SDK will implicitly create and manage the MeterProvider
  // traceExporter and spanProcessor could be added here for tracing if needed
})

export async function startTelemetry() {
  try {
    await sdk.start()
    console.log('OpenTelemetry SDK started successfully.')

    // Initialize custom metrics AFTER the SDK has started
    initializeMetrics()

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      try {
        await sdk.shutdown()
        console.log('OpenTelemetry SDK shut down successfully.')
      } catch (err) {
        console.error('Error shutting down OpenTelemetry SDK:', err)
      } finally {
        process.exit(0)
      }
    })
  } catch (error) {
    console.error('Error starting OpenTelemetry SDK:', error)
    process.exit(1)
  }
}

// No need to export meterProvider explicitly, use `metrics.getMeter()` from API

