import {
  computeComputeBoundDecodeTokensPerSecond,
  computeRooflineScenario,
  DEFAULT_ROOFLINE_BANDWIDTH_DOMAIN_GBPS,
  DEFAULT_ROOFLINE_PEAK_COMPUTE_FLOPS_PER_SECOND,
  type RooflineInvalidResult,
  type RooflineScenarioInputDraft,
  sampleMaximumThroughputBoundarySeries,
} from "./roofline-throughput-calculation";

export const ROOFLINE_THROUGHPUT_EXPLORER_CHART_LABEL =
  "Roofline Throughput Explorer";
export const ROOFLINE_THROUGHPUT_EXPLORER_AXIS_X = "Memory bandwidth (GB/s)";
export const ROOFLINE_THROUGHPUT_EXPLORER_AXIS_Y =
  "Decode throughput (tokens/s)";
export const ROOFLINE_THROUGHPUT_BOUNDARY_LEGEND_LABEL =
  "Maximum-throughput boundary";
export const ROOFLINE_THROUGHPUT_ACTIVE_SCENARIO_LEGEND_LABEL =
  "Active scenario";

export const ROOFLINE_THROUGHPUT_BOUNDARY_COLOR = "var(--primary)";
export const ROOFLINE_THROUGHPUT_ACTIVE_SCENARIO_COLOR =
  "color-mix(in oklch, var(--accent) 55%, var(--primary) 45%)";

export type RooflineThroughputChartDataPoint = {
  memoryBandwidthGbps: number;
  maximumThroughputBoundary: number;
};

export type RooflineThroughputActiveScenarioPoint = {
  decodeTokensPerSecond: number;
  memoryBandwidthGbps: number;
};

export type RooflineThroughputChartModel =
  | {
      kind: "valid";
      activePoint: RooflineThroughputActiveScenarioPoint;
      data: readonly RooflineThroughputChartDataPoint[];
      xDomain: readonly [number, number];
      yDomain: readonly [number, number];
    }
  | RooflineInvalidResult;

export function formatRooflineBandwidthGbps(value: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  }

  return value.toFixed(0);
}

export function formatRooflineDecodeTokensPerSecond(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0";
  }

  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(value % 1e6 === 0 ? 0 : 1)}M`;
  }

  if (value >= 1e3) {
    return `${(value / 1e3).toFixed(value % 1e3 === 0 ? 0 : 1)}k`;
  }

  if (value >= 10) {
    return value.toFixed(0);
  }

  return value.toFixed(1);
}

function resolvePeakComputeFlopsPerSecond(
  peakComputeFlopsPerSecond: number | undefined,
): number {
  return (
    peakComputeFlopsPerSecond ?? DEFAULT_ROOFLINE_PEAK_COMPUTE_FLOPS_PER_SECOND
  );
}

export function buildRooflineThroughputChartModel(
  inputs: RooflineScenarioInputDraft,
): RooflineThroughputChartModel {
  const scenario = computeRooflineScenario(inputs);
  if (scenario.kind === "invalid") {
    return scenario;
  }

  const boundary = sampleMaximumThroughputBoundarySeries({
    activeWeightSizeBillions: inputs.activeWeightSizeBillions,
    bytesPerParameter: inputs.bytesPerParameter,
    peakComputeFlopsPerSecond: inputs.peakComputeFlopsPerSecond,
  });
  if (boundary.kind === "invalid") {
    return boundary;
  }

  const memoryBandwidthGbps = inputs.memoryBandwidthGbps;
  if (memoryBandwidthGbps == null) {
    return {
      kind: "invalid",
      reason: "missing-memory-bandwidth",
      field: "memoryBandwidthGbps",
    };
  }

  const data = boundary.points.map((point) => ({
    memoryBandwidthGbps: point.memoryBandwidthGbps,
    maximumThroughputBoundary: point.maximumDecodeTokensPerSecond,
  }));

  const peakCompute = resolvePeakComputeFlopsPerSecond(
    inputs.peakComputeFlopsPerSecond,
  );
  const boundaryMax = data.reduce(
    (max, point) => Math.max(max, point.maximumThroughputBoundary),
    0,
  );
  const computeBoundDecodeTokensPerSecond =
    inputs.activeWeightSizeBillions == null
      ? 0
      : computeComputeBoundDecodeTokensPerSecond({
          activeWeightSizeBillions: inputs.activeWeightSizeBillions,
          peakComputeFlopsPerSecond: peakCompute,
        });
  const yMax = Math.max(
    computeBoundDecodeTokensPerSecond,
    boundaryMax,
    scenario.maximumDecodeTokensPerSecond,
  );

  return {
    kind: "valid",
    activePoint: {
      decodeTokensPerSecond: scenario.maximumDecodeTokensPerSecond,
      memoryBandwidthGbps,
    },
    data,
    xDomain: DEFAULT_ROOFLINE_BANDWIDTH_DOMAIN_GBPS,
    yDomain: [0, yMax * 1.05],
  };
}
