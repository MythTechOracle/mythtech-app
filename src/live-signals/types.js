/**
 * Live Signals contract types (JSDoc for static JS environments).
 * Dependency root for: fixtures -> adapter -> components -> host.
 */

/** @typedef {"low"|"medium"|"high"} Severity */
/** @typedef {"up"|"down"|"flat"} DeltaDirection */
/** @typedef {"low"|"moderate"|"mixed"|"healthy"|"elevated"|"improving"|"degraded"} MetricStatus */
/** @typedef {"emerging"|"single_source"|"confirmed_multi_source"|"corrected"} ConfirmationState */
/** @typedef {"none"|"clarified"|"corrected"|"retracted"} CorrectionState */

/** @type {readonly string[]} */
export const metricCardOrder = Object.freeze([
  "signal_velocity",
  "volatility_index",
  "source_diversity",
  "correction_rate",
  "cross_source_coherence",
  "uncertainty_index"
]);
