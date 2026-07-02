/** Approximate forward-pass matmul FLOPs per active parameter for one decode step. */
export const ROOFLINE_FLOPS_PER_PARAMETER_PER_TOKEN = 2;

/** Default peak compute used when callers omit an explicit hardware ceiling. */
export const DEFAULT_ROOFLINE_PEAK_COMPUTE_FLOPS_PER_SECOND = 500e12;

/** Default memory-bandwidth domain for the roofline chart in GB/s. */
export const DEFAULT_ROOFLINE_BANDWIDTH_DOMAIN_GBPS: readonly [number, number] =
  [100, 2000];

export type RooflineScenarioInputValues = {
  activeWeightSizeBillions: number;
  bytesPerParameter: number;
  memoryBandwidthGbps: number;
  peakComputeFlopsPerSecond?: number;
};

export type RooflineScenarioInputDraft = {
  activeWeightSizeBillions?: number;
  bytesPerParameter?: number;
  memoryBandwidthGbps?: number;
  peakComputeFlopsPerSecond?: number;
};

export type RooflineInvalidField =
  | "activeWeightSizeBillions"
  | "bytesPerParameter"
  | "memoryBandwidthGbps"
  | "peakComputeFlopsPerSecond";

export type RooflineInvalidReason =
  | "missing-active-weight-size"
  | "invalid-active-weight-size"
  | "missing-bytes-per-parameter"
  | "invalid-bytes-per-parameter"
  | "missing-memory-bandwidth"
  | "invalid-memory-bandwidth"
  | "invalid-peak-compute"
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
      memoryBoundComputeFlopsPerSecond: number;
      maximumComputeFlopsPerSecond: number;
    }
  | RooflineInvalidResult;

export type RooflineBoundaryPoint = {
  memoryBandwidthGbps: number;
  maximumComputeFlopsPerSecond: number;
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

function sanitizePositiveFiniteOutput(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return value;
}

function validateBytesPerParameter(
  value: number | undefined,
): RooflineInvalidResult | null {
  if (value == null) {
    return {
      kind: "invalid",
      reason: "missing-bytes-per-parameter",
      field: "bytesPerParameter",
    };
  }

  if (!isPositiveFiniteNumber(value)) {
    return {
      kind: "invalid",
      reason: "invalid-bytes-per-parameter",
      field: "bytesPerParameter",
    };
  }

  return null;
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

export function computeActiveWeightBytesPerToken(
  activeWeightSizeBillions: number,
  bytesPerParameter: number,
): number {
  return activeWeightSizeBillions * 1e9 * bytesPerParameter;
}

export function computeMemoryBoundComputeFlopsPerSecond({
  activeWeightSizeBillions,
  bytesPerParameter,
  memoryBandwidthGbps,
}: Pick<
  RooflineScenarioInputValues,
  "activeWeightSizeBillions" | "bytesPerParameter" | "memoryBandwidthGbps"
>): number {
  const bandwidthBytesPerSecond = memoryBandwidthGbps * 1e9;
  const activeWeightBytesPerToken = computeActiveWeightBytesPerToken(
    activeWeightSizeBillions,
    bytesPerParameter,
  );
  const tokensPerSecond = bandwidthBytesPerSecond / activeWeightBytesPerToken;
  const flopsPerToken =
    ROOFLINE_FLOPS_PER_PARAMETER_PER_TOKEN * activeWeightSizeBillions * 1e9;

  return sanitizePositiveFiniteOutput(tokensPerSecond * flopsPerToken);
}

export function computeMaximumComputeFlopsPerSecond(
  inputs: RooflineScenarioInputValues,
): number {
  const peakCompute = resolvePeakComputeFlopsPerSecond(
    inputs.peakComputeFlopsPerSecond,
  );
  if (typeof peakCompute !== "number") {
    return 0;
  }

  const memoryBound = computeMemoryBoundComputeFlopsPerSecond(inputs);
  return sanitizePositiveFiniteOutput(Math.min(peakCompute, memoryBound));
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

  const bytesPerParameterValidation = validateBytesPerParameter(
    inputs.bytesPerParameter,
  );
  if (bytesPerParameterValidation) {
    return bytesPerParameterValidation;
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
  const bytesPerParameter = inputs.bytesPerParameter;
  const memoryBandwidthGbps = inputs.memoryBandwidthGbps;

  if (
    activeWeightSizeBillions == null ||
    bytesPerParameter == null ||
    memoryBandwidthGbps == null
  ) {
    return {
      kind: "invalid",
      reason: "missing-active-weight-size",
      field: "activeWeightSizeBillions",
    };
  }

  const scenarioInputs: RooflineScenarioInputValues = {
    activeWeightSizeBillions,
    bytesPerParameter,
    memoryBandwidthGbps,
    peakComputeFlopsPerSecond: peakCompute,
  };

  return {
    kind: "valid",
    activeWeightBytesPerToken: computeActiveWeightBytesPerToken(
      activeWeightSizeBillions,
      bytesPerParameter,
    ),
    memoryBoundComputeFlopsPerSecond:
      computeMemoryBoundComputeFlopsPerSecond(scenarioInputs),
    maximumComputeFlopsPerSecond:
      computeMaximumComputeFlopsPerSecond(scenarioInputs),
  };
}

export function sampleMaximumThroughputBoundarySeries({
  activeWeightSizeBillions,
  bytesPerParameter,
  domain = DEFAULT_ROOFLINE_BANDWIDTH_DOMAIN_GBPS,
  peakComputeFlopsPerSecond,
  sampleCount = 25,
}: {
  activeWeightSizeBillions?: number;
  bytesPerParameter?: number;
  domain?: readonly [number, number];
  peakComputeFlopsPerSecond?: number;
  sampleCount?: number;
}): RooflineBoundarySeriesResult {
  const activeWeightValidation = validateActiveWeightSizeBillions(
    activeWeightSizeBillions,
  );
  if (activeWeightValidation) {
    return activeWeightValidation;
  }

  const bytesPerParameterValidation =
    validateBytesPerParameter(bytesPerParameter);
  if (bytesPerParameterValidation) {
    return bytesPerParameterValidation;
  }

  const peakCompute = resolvePeakComputeFlopsPerSecond(
    peakComputeFlopsPerSecond,
  );
  if (typeof peakCompute !== "number") {
    return peakCompute;
  }

  const [domainStart, domainEnd] = domain;
  if (
    !isPositiveFiniteNumber(domainStart) ||
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

  if (activeWeightSizeBillions == null || bytesPerParameter == null) {
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
      maximumComputeFlopsPerSecond: computeMaximumComputeFlopsPerSecond({
        activeWeightSizeBillions,
        bytesPerParameter,
        memoryBandwidthGbps,
        peakComputeFlopsPerSecond: peakCompute,
      }),
    };
  });

  return { kind: "valid", points };
}
