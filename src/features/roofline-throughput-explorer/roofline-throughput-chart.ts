import {
  computeBytesPerParameterFromQuantizationBits,
  computeRooflineScenario,
  DEFAULT_ROOFLINE_BANDWIDTH_DOMAIN_GBPS,
  ROOFLINE_FLOPS_PER_PARAMETER_PER_TOKEN,
  type RooflineInvalidResult,
  type RooflineScenarioInputDraft,
} from "./roofline-throughput-calculation";

export const ROOFLINE_THROUGHPUT_EXPLORER_CHART_LABEL =
  "Roofline Throughput Explorer";
export const ROOFLINE_THROUGHPUT_EXPLORER_AXIS_X = "Memory bandwidth (GB/s)";
export const ROOFLINE_THROUGHPUT_EXPLORER_AXIS_Y =
  "Attainable compute (FLOP/s)";
export const ROOFLINE_THROUGHPUT_BOUNDARY_LEGEND_LABEL =
  "Maximum-throughput boundary";

export const ROOFLINE_THROUGHPUT_BOUNDARY_COLOR = "var(--primary)";
export const ROOFLINE_THROUGHPUT_GUIDE_TOKENS_PER_SECOND = [
  20, 50, 75, 100, 200,
] as const;

export type RooflineComputeHostId =
  | "huawei-ascend-910c"
  | "m1-max"
  | "m1-pro"
  | "m1-ultra"
  | "m2-max"
  | "m2-ultra"
  | "m3"
  | "m3-max"
  | "m3-ultra"
  | "m4"
  | "m4-max"
  | "m4-ultra"
  | "m5"
  | "m5-max"
  | "m5-ultra"
  | "dgx-spark"
  | "rtx-4090"
  | "rtx-5090"
  | "h100"
  | "h200"
  | "gb300"
  | "intel-arc-b570"
  | "intel-arc-b580"
  | "rtx-4000-ada"
  | "rtx-4500-ada"
  | "rtx-5000-ada"
  | "rtx-6000-ada"
  | "rtx-pro-6000-blackwell"
  | "strix-halo"
  | "vera-rubin";

export type RooflineComputeHostPreset = {
  color: string;
  computeFlopsPerSecond: number;
  id: RooflineComputeHostId;
  label: string;
  memoryBandwidthGbps: number;
  note: string;
};

export const ROOFLINE_COMPUTE_HOST_PRESETS: readonly RooflineComputeHostPreset[] =
  [
    {
      id: "huawei-ascend-910c",
      label: "Huawei Ascend 910C",
      memoryBandwidthGbps: 3200,
      computeFlopsPerSecond: 800e12,
      color: "#dc2626",
      note: "Industry-estimated FP16/BF16 peak and HBM bandwidth",
    },
    {
      id: "m1-pro",
      label: "M1 Pro",
      memoryBandwidthGbps: 200,
      computeFlopsPerSecond: 5.2e12,
      color: "#0891b2",
      note: "Apple unified-memory laptop SoC, FP32-class GPU estimate",
    },
    {
      id: "m1-max",
      label: "M1 Max",
      memoryBandwidthGbps: 400,
      computeFlopsPerSecond: 10.4e12,
      color: "#0e7490",
      note: "Apple Max-class unified-memory SoC, FP32-class GPU estimate",
    },
    {
      id: "m1-ultra",
      label: "M1 Ultra",
      memoryBandwidthGbps: 800,
      computeFlopsPerSecond: 21e12,
      color: "#0f766e",
      note: "Apple unified-memory system, FP32-class GPU peak",
    },
    {
      id: "m2-max",
      label: "M2 Max",
      memoryBandwidthGbps: 400,
      computeFlopsPerSecond: 13.6e12,
      color: "#155e75",
      note: "Apple Max-class unified-memory SoC, FP32-class GPU estimate",
    },
    {
      id: "m2-ultra",
      label: "M2 Ultra",
      memoryBandwidthGbps: 800,
      computeFlopsPerSecond: 27.2e12,
      color: "#164e63",
      note: "Apple Ultra-class unified-memory SoC, FP32-class GPU estimate",
    },
    {
      id: "m3",
      label: "M3",
      memoryBandwidthGbps: 100,
      computeFlopsPerSecond: 3.6e12,
      color: "#14b8a6",
      note: "Apple unified-memory laptop SoC, FP32-class GPU estimate",
    },
    {
      id: "m3-max",
      label: "M3 Max",
      memoryBandwidthGbps: 400,
      computeFlopsPerSecond: 15e12,
      color: "#0d9488",
      note: "Apple Max-class unified-memory SoC, FP32-class GPU estimate",
    },
    {
      id: "m3-ultra",
      label: "M3 Ultra",
      memoryBandwidthGbps: 819,
      computeFlopsPerSecond: 30e12,
      color: "#115e59",
      note: "Apple Ultra-class unified-memory SoC, FP32-class GPU estimate",
    },
    {
      id: "m4",
      label: "M4",
      memoryBandwidthGbps: 120,
      computeFlopsPerSecond: 4.2e12,
      color: "#22c55e",
      note: "Apple unified-memory laptop/tablet SoC, FP32-class GPU estimate",
    },
    {
      id: "m4-max",
      label: "M4 Max",
      memoryBandwidthGbps: 546,
      computeFlopsPerSecond: 18e12,
      color: "#16a34a",
      note: "Apple Max-class unified-memory SoC, FP32-class GPU estimate",
    },
    {
      id: "m4-ultra",
      label: "M4 Ultra",
      memoryBandwidthGbps: 1092,
      computeFlopsPerSecond: 36e12,
      color: "#15803d",
      note: "Estimated Ultra-class doubling of M4 Max bandwidth and GPU peak",
    },
    {
      id: "m5",
      label: "M5",
      memoryBandwidthGbps: 153,
      computeFlopsPerSecond: 5.5e12,
      color: "#84cc16",
      note: "Apple unified-memory SoC, FP32-class GPU estimate",
    },
    {
      id: "m5-max",
      label: "M5 Max",
      memoryBandwidthGbps: 614,
      computeFlopsPerSecond: 22e12,
      color: "#65a30d",
      note: "Apple Max-class unified-memory SoC, FP32-class GPU estimate",
    },
    {
      id: "m5-ultra",
      label: "M5 Ultra",
      memoryBandwidthGbps: 1228,
      computeFlopsPerSecond: 44e12,
      color: "#4d7c0f",
      note: "Estimated Ultra-class doubling of M5 Max bandwidth and GPU peak",
    },
    {
      id: "dgx-spark",
      label: "DGX Spark",
      memoryBandwidthGbps: 273,
      computeFlopsPerSecond: 1000e12,
      color: "#ca8a04",
      note: "NVIDIA Grace Blackwell desktop system, FP4 sparse AI peak",
    },
    {
      id: "rtx-4090",
      label: "RTX 4090",
      memoryBandwidthGbps: 1008,
      computeFlopsPerSecond: 660e12,
      color: "#9333ea",
      note: "Ada Lovelace FP16 tensor peak with sparsity",
    },
    {
      id: "rtx-5090",
      label: "RTX 5090",
      memoryBandwidthGbps: 1792,
      computeFlopsPerSecond: 1676e12,
      color: "#7c3aed",
      note: "Dense FP16 tensor peak with FP16 accumulate",
    },
    {
      id: "h100",
      label: "H100 SXM",
      memoryBandwidthGbps: 3350,
      computeFlopsPerSecond: 1979e12,
      color: "#2563eb",
      note: "SXM FP16 tensor peak",
    },
    {
      id: "h200",
      label: "H200 SXM",
      memoryBandwidthGbps: 4800,
      computeFlopsPerSecond: 1979e12,
      color: "#1d4ed8",
      note: "SXM FP16 tensor peak with HBM3e bandwidth",
    },
    {
      id: "gb300",
      label: "GB300",
      memoryBandwidthGbps: 8000,
      computeFlopsPerSecond: 5000e12,
      color: "#c2410c",
      note: "Per-GPU slice derived from NVL72 aggregate FP16 and HBM bandwidth",
    },
    {
      id: "rtx-4000-ada",
      label: "RTX 4000 Ada",
      memoryBandwidthGbps: 360,
      computeFlopsPerSecond: 327.6e12,
      color: "#a855f7",
      note: "Workstation Ada tensor peak",
    },
    {
      id: "rtx-4500-ada",
      label: "RTX 4500 Ada",
      memoryBandwidthGbps: 432,
      computeFlopsPerSecond: 634e12,
      color: "#8b5cf6",
      note: "Workstation Ada tensor peak",
    },
    {
      id: "rtx-5000-ada",
      label: "RTX 5000 Ada",
      memoryBandwidthGbps: 576,
      computeFlopsPerSecond: 1044.4e12,
      color: "#6d28d9",
      note: "Workstation Ada tensor peak",
    },
    {
      id: "rtx-6000-ada",
      label: "RTX 6000 Ada",
      memoryBandwidthGbps: 960,
      computeFlopsPerSecond: 1457e12,
      color: "#581c87",
      note: "Workstation Ada tensor peak",
    },
    {
      id: "rtx-pro-6000-blackwell",
      label: "RTX PRO 6000 Blackwell",
      memoryBandwidthGbps: 1792,
      computeFlopsPerSecond: 4000e12,
      color: "#4338ca",
      note: "Workstation Blackwell AI peak",
    },
    {
      id: "strix-halo",
      label: "AMD Strix Halo",
      memoryBandwidthGbps: 256,
      computeFlopsPerSecond: 59.4e12,
      color: "#be123c",
      note: "Ryzen AI Max+ 395 Radeon 8060S theoretical FP16/BF16 peak",
    },
    {
      id: "intel-arc-b570",
      label: "Intel Arc B570",
      memoryBandwidthGbps: 380,
      computeFlopsPerSecond: 101.5e12,
      color: "#0284c7",
      note: "Battlemage desktop GPU, INT8 peak converted to FP16-class scale",
    },
    {
      id: "intel-arc-b580",
      label: "Intel Arc B580",
      memoryBandwidthGbps: 456,
      computeFlopsPerSecond: 116.5e12,
      color: "#0369a1",
      note: "Battlemage desktop GPU, INT8 peak converted to FP16-class scale",
    },
    {
      id: "vera-rubin",
      label: "Vera Rubin",
      memoryBandwidthGbps: 22000,
      computeFlopsPerSecond: 50000e12,
      color: "#0ea5e9",
      note: "NVIDIA Vera Rubin per-GPU HBM4 bandwidth and NVFP4-class inference peak",
    },
  ];

export type RooflineThroughputChartDataPoint = {
  boundaryComputeFlopsPerSecond: number;
  maximumDecodeTokensPerSecond: number;
  memoryBandwidthGbps: number;
};

export type RooflineThroughputHostPoint = {
  color: string;
  computeFlopsPerSecond: number;
  id: RooflineComputeHostId;
  label: string;
  maximumDecodeTokensPerSecond: number;
  memoryBandwidthGbps: number;
  note: string;
};

export type RooflineThroughputGuidePoint = {
  boundaryComputeFlopsPerSecond: number;
  label: string;
  maximumDecodeTokensPerSecond: number;
  memoryBandwidthGbps: number;
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
      guidePoints: readonly RooflineThroughputGuidePoint[];
      hostPoints: readonly RooflineThroughputHostPoint[];
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

export function formatRooflineFlopsPerSecond(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0";
  }

  if (value >= 1e15) {
    return `${(value / 1e15).toFixed(value % 1e15 === 0 ? 0 : 1)}P`;
  }

  if (value >= 1e12) {
    return `${(value / 1e12).toFixed(value % 1e12 === 0 ? 0 : 1)}T`;
  }

  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(value % 1e9 === 0 ? 0 : 1)}G`;
  }

  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(value % 1e6 === 0 ? 0 : 1)}M`;
  }

  return value.toFixed(0);
}

function computeDecodeFlopsPerToken(activeWeightSizeBillions: number): number {
  return (
    ROOFLINE_FLOPS_PER_PARAMETER_PER_TOKEN * activeWeightSizeBillions * 1e9
  );
}

function buildRooflineBandwidthSamples({
  domain,
  sampleCount = 181,
}: {
  domain: readonly [number, number];
  sampleCount?: number;
}): number[] {
  const [domainStart, domainEnd] = domain;
  const step =
    sampleCount > 1 ? (domainEnd - domainStart) / (sampleCount - 1) : 0;

  return Array.from({ length: sampleCount }, (_, index) =>
    Number((domainStart + step * index).toFixed(4)),
  );
}

function computeMaximumDecodeTokensPerSecondForHardware({
  activeWeightSizeBillions,
  batchSize,
  computeFlopsPerSecond,
  memoryBandwidthGbps,
  quantizationBits,
}: {
  activeWeightSizeBillions: number;
  batchSize: number;
  computeFlopsPerSecond: number;
  memoryBandwidthGbps: number;
  quantizationBits: number;
}): number {
  const memoryBoundTokensPerSecond =
    (memoryBandwidthGbps * batchSize) /
    (activeWeightSizeBillions *
      computeBytesPerParameterFromQuantizationBits(quantizationBits));
  const computeBoundTokensPerSecond =
    computeFlopsPerSecond / computeDecodeFlopsPerToken(activeWeightSizeBillions);

  return Math.min(memoryBoundTokensPerSecond, computeBoundTokensPerSecond);
}

function buildRooflineChartDomain(
  hosts: readonly RooflineComputeHostPreset[],
): readonly [number, number] {
  const hostMax = hosts.reduce(
    (max, host) => Math.max(max, host.memoryBandwidthGbps),
    DEFAULT_ROOFLINE_BANDWIDTH_DOMAIN_GBPS[1],
  );

  return [
    DEFAULT_ROOFLINE_BANDWIDTH_DOMAIN_GBPS[0],
    Math.ceil((hostMax * 1.08) / 100) * 100,
  ];
}

function resolvePositiveRooflineYDomain(
  values: readonly number[],
): readonly [number, number] {
  const positiveValues = values.filter(
    (value) => Number.isFinite(value) && value > 0,
  );

  if (positiveValues.length === 0) {
    return [1, 10];
  }

  const min = Math.min(...positiveValues);
  const max = Math.max(...positiveValues);

  return [Math.max(1, min * 0.85), max * 1.15];
}

export function buildRooflineThroughputChartModel(
  inputs: RooflineScenarioInputDraft,
): RooflineThroughputChartModel {
  const scenario = computeRooflineScenario(inputs);
  if (scenario.kind === "invalid") {
    return scenario;
  }

  const memoryBandwidthGbps = inputs.memoryBandwidthGbps;
  if (memoryBandwidthGbps == null) {
    return {
      kind: "invalid",
      reason: "missing-memory-bandwidth",
      field: "memoryBandwidthGbps",
    };
  }

  const activeWeightSizeBillions = inputs.activeWeightSizeBillions;
  if (activeWeightSizeBillions == null) {
    return {
      kind: "invalid",
      reason: "missing-active-weight-size",
      field: "activeWeightSizeBillions",
    };
  }

  const quantizationBits =
    inputs.quantizationBits ??
    (inputs.bytesPerParameter != null
      ? inputs.bytesPerParameter * 8
      : undefined);
  if (quantizationBits == null) {
    return {
      kind: "invalid",
      reason: "missing-quantization-bits",
      field: "quantizationBits",
    };
  }

  const batchSize = inputs.batchSize ?? 1;
  const flopsPerToken = computeDecodeFlopsPerToken(activeWeightSizeBillions);
  const bytesPerParameter =
    computeBytesPerParameterFromQuantizationBits(quantizationBits);
  const xDomain = buildRooflineChartDomain(ROOFLINE_COMPUTE_HOST_PRESETS);
  const data = buildRooflineBandwidthSamples({ domain: xDomain }).map(
    (bandwidthGbps) => {
      const maximumDecodeTokensPerSecond =
        (bandwidthGbps * batchSize) /
        (activeWeightSizeBillions * bytesPerParameter);

      return {
        boundaryComputeFlopsPerSecond:
          maximumDecodeTokensPerSecond * flopsPerToken,
        maximumDecodeTokensPerSecond,
        memoryBandwidthGbps: bandwidthGbps,
      };
    },
  );
  const guidePoints = ROOFLINE_THROUGHPUT_GUIDE_TOKENS_PER_SECOND.map(
    (maximumDecodeTokensPerSecond) => ({
      boundaryComputeFlopsPerSecond:
        maximumDecodeTokensPerSecond * flopsPerToken,
      label: formatRooflineDecodeTokensPerSecond(
        maximumDecodeTokensPerSecond,
      ),
      maximumDecodeTokensPerSecond,
      memoryBandwidthGbps:
        (maximumDecodeTokensPerSecond *
          activeWeightSizeBillions *
          bytesPerParameter) /
        batchSize,
    }),
  );
  const hostPoints = ROOFLINE_COMPUTE_HOST_PRESETS.map((host) => ({
    ...host,
    maximumDecodeTokensPerSecond: computeMaximumDecodeTokensPerSecondForHardware(
      {
        activeWeightSizeBillions,
        batchSize,
        computeFlopsPerSecond: host.computeFlopsPerSecond,
        memoryBandwidthGbps: host.memoryBandwidthGbps,
        quantizationBits,
      },
    ),
  }));

  return {
    kind: "valid",
    activePoint: {
      decodeTokensPerSecond: scenario.maximumDecodeTokensPerSecond,
      memoryBandwidthGbps,
    },
    data,
    guidePoints,
    hostPoints,
    xDomain,
    yDomain: resolvePositiveRooflineYDomain([
      ...data.map((point) => point.boundaryComputeFlopsPerSecond),
      ...hostPoints.map((point) => point.computeFlopsPerSecond),
    ]),
  };
}
