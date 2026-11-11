
import { SmartSpectraSDK } from "@smartspectra/node-sdk/renderer";

// Presage SDK configuration
const SDK_OPTIONS = {
  enableTelemetry: false,
  enableAccumulatedOutput: true,
};

export function createPresageService(callbacks = {}) {
  const sdk = new SmartSpectraSDK(SDK_OPTIONS);

  sdk.on("metrics", (buffer, timestamp) => {
    callbacks.onMetrics?.(buffer, timestamp);
  });

  sdk.on("validationStatus", (code, timestamp, hint) => {
    callbacks.onValidationStatus?.(code, timestamp, hint);
  });

  sdk.on("processingStatus", (status) => {
    callbacks.onProcessingStatus?.(status);
  });

  sdk.on("error", (code, message, retryable) => {
    callbacks.onError?.({ code, message, retryable });
  });

  sdk.on("streamAvailable", (stream) => {
    callbacks.onStreamAvailable?.(stream);
  });

  return {
    sdk,

    // Explicitly called later after user authorization.
    start: () => sdk.start(),

    stop: () => sdk.stop(),

    destroy: () => sdk.destroy(),
  };
}
