/** Approximate forward-pass matmul FLOPs per active parameter for one decode step. */
export const ROOFLINE_FLOPS_PER_PARAMETER_PER_TOKEN = 2;

/** Default peak compute used when callers omit an explicit hardware ceiling. */
export const DEFAULT_ROOFLINE_PEAK_COMPUTE_FLOPS_PER_SECOND = 500e12;

/** Default memory-bandwidth domain for the roofline chart in GB/s. */
export const DEFAULT_ROOFLINE_BANDWIDTH_DOMAIN_GBPS: readonly [number, number] =
  [0, 2000];

export type RooflineScenarioInputValues = {
  activeWeightSizeBillions: number;
  batchSize?: number;
  bytesPerParameter?: number;
  memoryBandwidthGbps: number;
  peakComputeFlopsPerSecond?: number;
  quantizationBits?: number;
};

export type RooflineScenarioInputDraft = {
  activeWeightSizeBillions?: number;
  batchSize?: number;
  bytesPerParameter?: number;
  memoryBandwidthGbps?: number;
  peakComputeFlopsPerSecond?: number;
  quantizationBits?: number;
};

export type RooflineInvalidField =
  | "activeWeightSizeBillions"
  | "batchSize"
  | "bytesPerParameter"
  | "memoryBandwidthGbps"
  | "peakComputeFlopsPerSecond"
  | "quantizationBits";

export type RooflineInvalidReason =
  | "missing-active-weight-size"
  | "invalid-active-weight-size"
  | "missing-batch-size"
  | "invalid-batch-size"
  | "missing-bytes-per-parameter"
  | "invalid-bytes-per-parameter"
  | "missing-memory-bandwidth"
  | "invalid-memory-bandwidth"
  | "invalid-peak-compute"
  | "missing-quantization-bits"
  | "invalid-quantization-bits"
  | "invalid-bandwidth-domain";

export type RooflineInvalidResult = {
  kind: "invalid";
  reason: RooflineInvalidReason;
  field: RooflineInvalidField;
};

export type RooflineScenarioResult =
  | {
      kind: "valid";
      activeWeightBytesPerToken: number;
      computeBoundDecodeTokensPerSecond: number;
      memoryBoundDecodeTokensPerSecond: number;
      maximumDecodeTokensPerSecond: number;
    }
  | RooflineInvalidResult;

export type RooflineBoundaryPoint = {
  memoryBandwidthGbps: number;
  maximumDecodeTokensPerSecond: number;
};

export type RooflineBoundarySeriesResult =
  | {
      kind: "valid";
      points: readonly RooflineBoundaryPoint[];
    }
  | RooflineInvalidResult;

function isPositiveFiniteNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonNegativeFiniteNumber(
  value: number | undefined,
): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function sanitizePositiveFiniteOutput(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return value;
}

function validatePositiveInput(
  value: number | undefined,
  missingReason: RooflineInvalidReason,
  invalidReason: RooflineInvalidReason,
  field: RooflineInvalidField,
): RooflineInvalidResult | null {
  if (value == null) {
    return {
      kind: "invalid",
      reason: missingReason,
      field,
    };
  }

  if (!isPositiveFiniteNumber(value)) {
    return {
      kind: "invalid",
      reason: invalidReason,
      field,
    };
  }

  return null;
}

function validateBytesPerParameter(
  value: number | undefined,
): RooflineInvalidResult | null {
  return validatePositiveInput(
    value,
    "missing-bytes-per-parameter",
    "invalid-bytes-per-parameter",
    "bytesPerParameter",
  );
}

function validateQuantizationBits(
  value: number | undefined,
): RooflineInvalidResult | null {
  return validatePositiveInput(
    value,
    "missing-quantization-bits",
    "invalid-quantization-bits",
    "quantizationBits",
  );
}

function validateBatchSize(
  value: number | undefined,
): RooflineInvalidResult | null {
  return validatePositiveInput(
    value,
    "missing-batch-size",
    "invalid-batch-size",
    "batchSize",
  );
}

function validateActiveWeightSizeBillions(
  value: number | undefined,
): RooflineInvalidResult | null {
  if (value == null) {
    return {
      kind: "invalid",
      reason: "missing-active-weight-size",
      field: "activeWeightSizeBillions",
    };
  }

  if (!isPositiveFiniteNumber(value)) {
    return {
      kind: "invalid",
      reason: "invalid-active-weight-size",
      field: "activeWeightSizeBillions",
    };
  }

  return null;
}

function validateMemoryBandwidthGbps(
  value: number | undefined,
): RooflineInvalidResult | null {
  if (value == null) {
    return {
      kind: "invalid",
      reason: "missing-memory-bandwidth",
      field: "memoryBandwidthGbps",
    };
  }

  if (!isPositiveFiniteNumber(value)) {
    return {
      kind: "invalid",
      reason: "invalid-memory-bandwidth",
      field: "memoryBandwidthGbps",
    };
  }

  return null;
}

function resolvePeakComputeFlopsPerSecond(
  value: number | undefined,
): RooflineInvalidResult | number {
  if (value == null) {
    return DEFAULT_ROOFLINE_PEAK_COMPUTE_FLOPS_PER_SECOND;
  }

  if (!isPositiveFiniteNumber(value)) {
    return {
      kind: "invalid",
      reason: "invalid-peak-compute",
      field: "peakComputeFlopsPerSecond",
    };
  }

  return value;
}

function resolveQuantizationBits(
  inputs: Pick<
    RooflineScenarioInputDraft,
    "bytesPerParameter" | "quantizationBits"
  >,
): RooflineInvalidResult | number {
  if (inputs.quantizationBits != null) {
    const validation = validateQuantizationBits(inputs.quantizationBits);
    return validation ?? inputs.quantizationBits;
  }

  const bytesValidation = validateBytesPerParameter(inputs.bytesPerParameter);
  if (bytesValidation) {
    return {
      kind: "invalid",
      reason:
        bytesValidation.reason === "missing-bytes-per-parameter"
          ? "missing-quantization-bits"
          : "invalid-quantization-bits",
      field: "quantizationBits",
    };
  }

  return inputs.bytesPerParameter * 8;
}

function resolveBatchSize(
  value: number | undefined,
): RooflineInvalidResult | number {
  if (value == null) {
    return 1;
  }

  const validation = validateBatchSize(value);
  return validation ?? value;
}

export function computeBytesPerParameterFromQuantizationBits(
  quantizationBits: number,
): number {
  return quantizationBits / 8;
}

export function computeActiveWeightBytesPerToken(
  activeWeightSizeBillions: number,
  quantizationBits: number,
  batchSize = 1,
): number {
  return (
    (activeWeightSizeBillions *
      1e9 *
      computeBytesPerParameterFromQuantizationBits(quantizationBits)) /
    batchSize
  );
}

export function computeMemoryBoundDecodeTokensPerSecond({
  activeWeightSizeBillions,
  batchSize,
  bytesPerParameter,
  quantizationBits,
  memoryBandwidthGbps,
}: Pick<
  RooflineScenarioInputValues,
  | "activeWeightSizeBillions"
  | "batchSize"
  | "bytesPerParameter"
  | "memoryBandwidthGbps"
  | "quantizationBits"
>): number {
  const resolvedQuantizationBits = resolveQuantizationBits({
    bytesPerParameter,
    quantizationBits,
  });
  const resolvedBatchSize = resolveBatchSize(batchSize);
  if (
    typeof resolvedQuantizationBits !== "number" ||
    typeof resolvedBatchSize !== "number"
  ) {
    return 0;
  }

  const bandwidthBytesPerSecond = memoryBandwidthGbps * 1e9;
  const activeWeightBytesPerToken = computeActiveWeightBytesPerToken(
    activeWeightSizeBillions,
    resolvedQuantizationBits,
    resolvedBatchSize,
  );

  return sanitizePositiveFiniteOutput(
    bandwidthBytesPerSecond / activeWeightBytesPerToken,
  );
}

export function computeComputeBoundDecodeTokensPerSecond({
  activeWeightSizeBillions,
  peakComputeFlopsPerSecond,
}: Pick<RooflineScenarioInputValues, "activeWeightSizeBillions"> & {
  peakComputeFlopsPerSecond: number;
}): number {
  const flopsPerToken =
    ROOFLINE_FLOPS_PER_PARAMETER_PER_TOKEN * activeWeightSizeBillions * 1e9;

  return sanitizePositiveFiniteOutput(
    peakComputeFlopsPerSecond / flopsPerToken,
  );
}

export function computeMaximumDecodeTokensPerSecond(
  inputs: RooflineScenarioInputValues,
): number {
  const peakCompute = resolvePeakComputeFlopsPerSecond(
    inputs.peakComputeFlopsPerSecond,
  );
  if (typeof peakCompute !== "number") {
    return 0;
  }

  const memoryBound = computeMemoryBoundDecodeTokensPerSecond(inputs);
  const computeBound = computeComputeBoundDecodeTokensPerSecond({
    activeWeightSizeBillions: inputs.activeWeightSizeBillions,
    peakComputeFlopsPerSecond: peakCompute,
  });

  return sanitizePositiveFiniteOutput(Math.min(memoryBound, computeBound));
}

export function computeRooflineScenario(
  inputs: RooflineScenarioInputDraft,
): RooflineScenarioResult {
  const activeWeightValidation = validateActiveWeightSizeBillions(
    inputs.activeWeightSizeBillions,
  );
  if (activeWeightValidation) {
    return activeWeightValidation;
  }

  const quantizationBits = resolveQuantizationBits(inputs);
  if (typeof quantizationBits !== "number") {
    return quantizationBits;
  }

  const batchSize = resolveBatchSize(inputs.batchSize);
  if (typeof batchSize !== "number") {
    return batchSize;
  }

  const quantizationBitsValidation = validateQuantizationBits(
    quantizationBits,
  );
  if (quantizationBitsValidation) {
    return quantizationBitsValidation;
  }

  const memoryBandwidthValidation = validateMemoryBandwidthGbps(
    inputs.memoryBandwidthGbps,
  );
  if (memoryBandwidthValidation) {
    return memoryBandwidthValidation;
  }

  const peakCompute = resolvePeakComputeFlopsPerSecond(
    inputs.peakComputeFlopsPerSecond,
  );
  if (typeof peakCompute !== "number") {
    return peakCompute;
  }

  const activeWeightSizeBillions = inputs.activeWeightSizeBillions;
  const memoryBandwidthGbps = inputs.memoryBandwidthGbps;

  if (activeWeightSizeBillions == null || memoryBandwidthGbps == null) {
    return {
      kind: "invalid",
      reason: "missing-active-weight-size",
      field: "activeWeightSizeBillions",
    };
  }

  const scenarioInputs: RooflineScenarioInputValues = {
    activeWeightSizeBillions,
    batchSize,
    memoryBandwidthGbps,
    peakComputeFlopsPerSecond: peakCompute,
    quantizationBits,
  };

  return {
    kind: "valid",
    activeWeightBytesPerToken: computeActiveWeightBytesPerToken(
      activeWeightSizeBillions,
      quantizationBits,
      batchSize,
    ),
    computeBoundDecodeTokensPerSecond: computeComputeBoundDecodeTokensPerSecond(
      {
        activeWeightSizeBillions,
        peakComputeFlopsPerSecond: peakCompute,
      },
    ),
    memoryBoundDecodeTokensPerSecond:
      computeMemoryBoundDecodeTokensPerSecond(scenarioInputs),
    maximumDecodeTokensPerSecond:
      computeMaximumDecodeTokensPerSecond(scenarioInputs),
  };
}

export function sampleMaximumThroughputBoundarySeries({
  activeWeightSizeBillions,
  batchSize,
  bytesPerParameter,
  domain = DEFAULT_ROOFLINE_BANDWIDTH_DOMAIN_GBPS,
  peakComputeFlopsPerSecond,
  quantizationBits,
  sampleCount = 25,
}: {
  activeWeightSizeBillions?: number;
  batchSize?: number;
  bytesPerParameter?: number;
  domain?: readonly [number, number];
  peakComputeFlopsPerSecond?: number;
  quantizationBits?: number;
  sampleCount?: number;
}): RooflineBoundarySeriesResult {
  const activeWeightValidation = validateActiveWeightSizeBillions(
    activeWeightSizeBillions,
  );
  if (activeWeightValidation) {
    return activeWeightValidation;
  }

  const resolvedQuantizationBits = resolveQuantizationBits({
    bytesPerParameter,
    quantizationBits,
  });
  if (typeof resolvedQuantizationBits !== "number") {
    return resolvedQuantizationBits;
  }

  const resolvedBatchSize = resolveBatchSize(batchSize);
  if (typeof resolvedBatchSize !== "number") {
    return resolvedBatchSize;
  }

  const peakCompute = resolvePeakComputeFlopsPerSecond(
    peakComputeFlopsPerSecond,
  );
  if (typeof peakCompute !== "number") {
    return peakCompute;
  }

  const [domainStart, domainEnd] = domain;
  if (
    !isNonNegativeFiniteNumber(domainStart) ||
    !isPositiveFiniteNumber(domainEnd) ||
    domainStart >= domainEnd ||
    !Number.isInteger(sampleCount) ||
    sampleCount < 2
  ) {
    return {
      kind: "invalid",
      reason: "invalid-bandwidth-domain",
      field: "memoryBandwidthGbps",
    };
  }

  if (activeWeightSizeBillions == null) {
    return {
      kind: "invalid",
      reason: "missing-active-weight-size",
      field: "activeWeightSizeBillions",
    };
  }

  const step =
    sampleCount > 1 ? (domainEnd - domainStart) / (sampleCount - 1) : 0;

  const points = Array.from({ length: sampleCount }, (_, index) => {
    const memoryBandwidthGbps = Number((domainStart + step * index).toFixed(4));

    return {
      memoryBandwidthGbps,
      maximumDecodeTokensPerSecond: computeMaximumDecodeTokensPerSecond({
        activeWeightSizeBillions,
        batchSize: resolvedBatchSize,
        memoryBandwidthGbps,
        peakComputeFlopsPerSecond: peakCompute,
        quantizationBits: resolvedQuantizationBits,
      }),
    };
  });

  return { kind: "valid", points };
}
