import { describe, expect, test } from "bun:test";
import {
  computeActiveWeightBytesPerToken,
  computeMemoryBoundComputeFlopsPerSecond,
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
      bytesPerParameter: 2,
      memoryBandwidthGbps: 1000,
    });

    expect(result.kind).toBe("valid");
    if (result.kind !== "valid") {
      return;
    }

    expect(result.activeWeightBytesPerToken).toBe(27 * 1e9 * 2);
    expectFiniteNonNegative(result.memoryBoundComputeFlopsPerSecond);
    expectFiniteNonNegative(result.maximumComputeFlopsPerSecond);
    expect(result.maximumComputeFlopsPerSecond).toBeLessThanOrEqual(
      DEFAULT_ROOFLINE_PEAK_COMPUTE_FLOPS_PER_SECOND,
    );
  });

  test("uses active weight size as the explicit model-size input", () => {
    const smallModel = computeRooflineScenario({
      activeWeightSizeBillions: 0.6,
      bytesPerParameter: 2,
      memoryBandwidthGbps: 500,
    });
    const largeModel = computeRooflineScenario({
      activeWeightSizeBillions: 40,
      bytesPerParameter: 2,
      memoryBandwidthGbps: 500,
    });

    expect(smallModel.kind).toBe("valid");
    expect(largeModel.kind).toBe("valid");
    if (smallModel.kind !== "valid" || largeModel.kind !== "valid") {
      return;
    }

    expect(smallModel.activeWeightBytesPerToken).toBeLessThan(
      largeModel.activeWeightBytesPerToken,
    );
    expect(smallModel.memoryBoundComputeFlopsPerSecond).toBe(
      largeModel.memoryBoundComputeFlopsPerSecond,
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
        bytesPerParameter: 2,
        memoryBandwidthGbps: 1000,
      }),
    ).toEqual({
      kind: "invalid",
      reason: "invalid-active-weight-size",
      field: "activeWeightSizeBillions",
    });

    expect(
      computeRooflineScenario({
        activeWeightSizeBillions: 27,
        bytesPerParameter: 0,
        memoryBandwidthGbps: 1000,
      }),
    ).toEqual({
      kind: "invalid",
      reason: "invalid-bytes-per-parameter",
      field: "bytesPerParameter",
    });

    expect(
      computeRooflineScenario({
        activeWeightSizeBillions: 27,
        bytesPerParameter: 2,
        memoryBandwidthGbps: -1,
      }),
    ).toEqual({
      kind: "invalid",
      reason: "invalid-memory-bandwidth",
      field: "memoryBandwidthGbps",
    });

    expect(
      computeRooflineScenario({
        activeWeightSizeBillions: 27,
        bytesPerParameter: 2,
        memoryBandwidthGbps: 1000,
        peakComputeFlopsPerSecond: Number.POSITIVE_INFINITY,
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
      bytesPerParameter: 2,
      domain: DEFAULT_ROOFLINE_BANDWIDTH_DOMAIN_GBPS,
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
      expectFiniteNonNegative(point.maximumComputeFlopsPerSecond);
      expect(Number.isNaN(point.maximumComputeFlopsPerSecond)).toBe(false);
    }

    const values = result.points.map(
      (point) => point.maximumComputeFlopsPerSecond,
    );
    const firstValue = values[0] ?? 0;
    expect(
      values.every((value, index) => index === 0 || value >= firstValue),
    ).toBe(true);
  });

  test("returns typed invalid states for incomplete series inputs", () => {
    expect(
      sampleMaximumThroughputBoundarySeries({
        bytesPerParameter: 2,
      }),
    ).toEqual({
      kind: "invalid",
      reason: "missing-active-weight-size",
      field: "activeWeightSizeBillions",
    });

    expect(
      sampleMaximumThroughputBoundarySeries({
        activeWeightSizeBillions: 27,
        bytesPerParameter: 2,
        domain: [2000, 100],
      }),
    ).toEqual({
      kind: "invalid",
      reason: "invalid-bandwidth-domain",
      field: "memoryBandwidthGbps",
    });
  });
});

describe("roofline throughput helpers", () => {
  test("derives active weight bytes from explicit billions and bytes per parameter", () => {
    expect(computeActiveWeightBytesPerToken(3, 2)).toBe(6e9);
  });

  test("derives memory-bound compute from bandwidth and precision assumptions", () => {
    const memoryBound = computeMemoryBoundComputeFlopsPerSecond({
      activeWeightSizeBillions: 10,
      bytesPerParameter: 2,
      memoryBandwidthGbps: 1000,
    });

    expect(memoryBound).toBeCloseTo(
      ((1000 * 1e9) / (10 * 1e9 * 2)) *
        ROOFLINE_FLOPS_PER_PARAMETER_PER_TOKEN *
        10 *
        1e9,
    );
  });
});
