import { describe, expect, test } from "bun:test";
import {
  computeActiveWeightBytesPerToken,
  computeMaximumDecodeTokensPerSecond,
  computeMemoryBoundDecodeTokensPerSecond,
  computeRooflineScenario,
  DEFAULT_ROOFLINE_BANDWIDTH_DOMAIN_GBPS,
  DEFAULT_ROOFLINE_PEAK_COMPUTE_FLOPS_PER_SECOND,
  ROOFLINE_FLOPS_PER_PARAMETER_PER_TOKEN,
  sampleMaximumThroughputBoundarySeries,
} from "./roofline-throughput-calculation";

function expectFiniteNonNegative(value: number) {
  expect(Number.isFinite(value)).toBe(true);
  expect(value).toBeGreaterThanOrEqual(0);
}

describe("computeRooflineScenario", () => {
  test("returns a finite maximum-throughput scenario for valid inputs", () => {
    const result = computeRooflineScenario({
      activeWeightSizeBillions: 27,
      memoryBandwidthGbps: 1000,
      quantizationBits: 16,
    });

    expect(result.kind).toBe("valid");
    if (result.kind !== "valid") {
      return;
    }

    expect(result.activeWeightBytesPerToken).toBe(27 * 1e9 * 2);
    expectFiniteNonNegative(result.memoryBoundDecodeTokensPerSecond);
    expectFiniteNonNegative(result.computeBoundDecodeTokensPerSecond);
    expectFiniteNonNegative(result.maximumDecodeTokensPerSecond);
    expect(result.maximumDecodeTokensPerSecond).toBeLessThanOrEqual(
      result.memoryBoundDecodeTokensPerSecond,
    );
    expect(result.maximumDecodeTokensPerSecond).toBeLessThanOrEqual(
      result.computeBoundDecodeTokensPerSecond,
    );
  });

  test("uses active weight size as the explicit model-size input", () => {
    const smallModel = computeRooflineScenario({
      activeWeightSizeBillions: 0.6,
      memoryBandwidthGbps: 500,
      quantizationBits: 16,
    });
    const largeModel = computeRooflineScenario({
      activeWeightSizeBillions: 40,
      memoryBandwidthGbps: 500,
      quantizationBits: 16,
    });

    expect(smallModel.kind).toBe("valid");
    expect(largeModel.kind).toBe("valid");
    if (smallModel.kind !== "valid" || largeModel.kind !== "valid") {
      return;
    }

    expect(smallModel.activeWeightBytesPerToken).toBeLessThan(
      largeModel.activeWeightBytesPerToken,
    );
    expect(smallModel.memoryBoundDecodeTokensPerSecond).toBeGreaterThan(
      largeModel.memoryBoundDecodeTokensPerSecond,
    );
    expect(smallModel.maximumDecodeTokensPerSecond).toBeGreaterThan(
      largeModel.maximumDecodeTokensPerSecond,
    );
  });

  test("returns typed invalid states for incomplete custom inputs", () => {
    expect(computeRooflineScenario({})).toEqual({
      kind: "invalid",
      reason: "missing-active-weight-size",
      field: "activeWeightSizeBillions",
    });

    expect(
      computeRooflineScenario({
        activeWeightSizeBillions: Number.NaN,
        memoryBandwidthGbps: 1000,
        quantizationBits: 16,
      }),
    ).toEqual({
      kind: "invalid",
      reason: "invalid-active-weight-size",
      field: "activeWeightSizeBillions",
    });

    expect(
      computeRooflineScenario({
        activeWeightSizeBillions: 27,
        memoryBandwidthGbps: 1000,
        batchSize: 0,
        quantizationBits: 16,
      }),
    ).toEqual({
      kind: "invalid",
      reason: "invalid-batch-size",
      field: "batchSize",
    });

    expect(
      computeRooflineScenario({
        activeWeightSizeBillions: 27,
        memoryBandwidthGbps: 1000,
        quantizationBits: 0,
      }),
    ).toEqual({
      kind: "invalid",
      reason: "invalid-quantization-bits",
      field: "quantizationBits",
    });

    expect(
      computeRooflineScenario({
        activeWeightSizeBillions: 27,
        memoryBandwidthGbps: -1,
        quantizationBits: 16,
      }),
    ).toEqual({
      kind: "invalid",
      reason: "invalid-memory-bandwidth",
      field: "memoryBandwidthGbps",
    });

    expect(
      computeRooflineScenario({
        activeWeightSizeBillions: 27,
        memoryBandwidthGbps: 1000,
        peakComputeFlopsPerSecond: Number.POSITIVE_INFINITY,
        quantizationBits: 16,
      }),
    ).toEqual({
      kind: "invalid",
      reason: "invalid-peak-compute",
      field: "peakComputeFlopsPerSecond",
    });
  });
});

describe("sampleMaximumThroughputBoundarySeries", () => {
  test("returns a sampled maximum-throughput boundary without invalid numeric output", () => {
    const result = sampleMaximumThroughputBoundarySeries({
      activeWeightSizeBillions: 27,
      domain: DEFAULT_ROOFLINE_BANDWIDTH_DOMAIN_GBPS,
      quantizationBits: 16,
      sampleCount: 5,
    });

    expect(result.kind).toBe("valid");
    if (result.kind !== "valid") {
      return;
    }

    expect(result.points).toHaveLength(5);
    expect(result.points[0]?.memoryBandwidthGbps).toBe(
      DEFAULT_ROOFLINE_BANDWIDTH_DOMAIN_GBPS[0],
    );
    expect(result.points.at(-1)?.memoryBandwidthGbps).toBe(
      DEFAULT_ROOFLINE_BANDWIDTH_DOMAIN_GBPS[1],
    );

    for (const point of result.points) {
      expectFiniteNonNegative(point.maximumDecodeTokensPerSecond);
      expect(Number.isNaN(point.maximumDecodeTokensPerSecond)).toBe(false);
    }

    const values = result.points.map(
      (point) => point.maximumDecodeTokensPerSecond,
    );
    const firstValue = values[0] ?? 0;
    expect(
      values.every((value, index) => index === 0 || value >= firstValue),
    ).toBe(true);
  });

  test("shifts the boundary down when active weight size increases", () => {
    const smallModel = sampleMaximumThroughputBoundarySeries({
      activeWeightSizeBillions: 7,
      domain: DEFAULT_ROOFLINE_BANDWIDTH_DOMAIN_GBPS,
      quantizationBits: 16,
      sampleCount: 5,
    });
    const largeModel = sampleMaximumThroughputBoundarySeries({
      activeWeightSizeBillions: 70,
      domain: DEFAULT_ROOFLINE_BANDWIDTH_DOMAIN_GBPS,
      quantizationBits: 16,
      sampleCount: 5,
    });

    expect(smallModel.kind).toBe("valid");
    expect(largeModel.kind).toBe("valid");
    if (smallModel.kind !== "valid" || largeModel.kind !== "valid") {
      return;
    }

    expect(
      smallModel.points[2]?.maximumDecodeTokensPerSecond ?? 0,
    ).toBeGreaterThan(
      largeModel.points[2]?.maximumDecodeTokensPerSecond ??
        Number.POSITIVE_INFINITY,
    );
  });

  test("returns typed invalid states for incomplete series inputs", () => {
    expect(
      sampleMaximumThroughputBoundarySeries({
        quantizationBits: 16,
      }),
    ).toEqual({
      kind: "invalid",
      reason: "missing-active-weight-size",
      field: "activeWeightSizeBillions",
    });

    expect(
      sampleMaximumThroughputBoundarySeries({
        activeWeightSizeBillions: 27,
        domain: [2000, 100],
        quantizationBits: 16,
      }),
    ).toEqual({
      kind: "invalid",
      reason: "invalid-bandwidth-domain",
      field: "memoryBandwidthGbps",
    });
  });
});

describe("roofline throughput helpers", () => {
  test("derives active weight bytes from explicit billions, quantization bits, and batch size", () => {
    expect(computeActiveWeightBytesPerToken(3, 16)).toBe(6e9);
    expect(computeActiveWeightBytesPerToken(3, 16, 2)).toBe(3e9);
  });

  test("derives memory-bound decode throughput from bandwidth and active weight reads", () => {
    const memoryBound = computeMemoryBoundDecodeTokensPerSecond({
      activeWeightSizeBillions: 10,
      memoryBandwidthGbps: 1000,
      quantizationBits: 16,
    });

    expect(memoryBound).toBeCloseTo((1000 * 1e9) / (10 * 1e9 * 2));
  });

  test("scales memory-bound decode throughput with batch size", () => {
    const batchOne = computeMemoryBoundDecodeTokensPerSecond({
      activeWeightSizeBillions: 10,
      batchSize: 1,
      memoryBandwidthGbps: 1000,
      quantizationBits: 16,
    });
    const batchEight = computeMemoryBoundDecodeTokensPerSecond({
      activeWeightSizeBillions: 10,
      batchSize: 8,
      memoryBandwidthGbps: 1000,
      quantizationBits: 16,
    });

    expect(batchEight).toBeCloseTo(batchOne * 8);
  });

  test("derives maximum decode throughput as the minimum of memory and compute bounds", () => {
    const maximum = computeMaximumDecodeTokensPerSecond({
      activeWeightSizeBillions: 10,
      memoryBandwidthGbps: 1000,
      quantizationBits: 16,
      peakComputeFlopsPerSecond: DEFAULT_ROOFLINE_PEAK_COMPUTE_FLOPS_PER_SECOND,
    });

    const memoryBound = computeMemoryBoundDecodeTokensPerSecond({
      activeWeightSizeBillions: 10,
      memoryBandwidthGbps: 1000,
      quantizationBits: 16,
    });
    const computeBound =
      DEFAULT_ROOFLINE_PEAK_COMPUTE_FLOPS_PER_SECOND /
      (ROOFLINE_FLOPS_PER_PARAMETER_PER_TOKEN * 10 * 1e9);

    expect(maximum).toBeCloseTo(Math.min(memoryBound, computeBound));
  });
});
