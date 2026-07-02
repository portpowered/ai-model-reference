import { describe, expect, test } from "bun:test";
import { DEFAULT_ROOFLINE_BANDWIDTH_DOMAIN_GBPS } from "./roofline-throughput-calculation";
import {
  buildRooflineThroughputChartModel,
  formatRooflineBandwidthGbps,
  formatRooflineDecodeTokensPerSecond,
} from "./roofline-throughput-chart";

describe("buildRooflineThroughputChartModel", () => {
  test("returns boundary series and active point for valid inputs", () => {
    const model = buildRooflineThroughputChartModel({
      activeWeightSizeBillions: 27,
      bytesPerParameter: 2,
      memoryBandwidthGbps: 1000,
    });

    expect(model.kind).toBe("valid");
    if (model.kind !== "valid") {
      return;
    }

    expect(model.data.length).toBeGreaterThan(1);
    expect(model.xDomain).toEqual(DEFAULT_ROOFLINE_BANDWIDTH_DOMAIN_GBPS);
    expect(model.yDomain[0]).toBe(0);
    expect(model.yDomain[1]).toBeGreaterThan(0);
    expect(model.activePoint.memoryBandwidthGbps).toBe(1000);
    expect(model.activePoint.decodeTokensPerSecond).toBeGreaterThan(0);

    for (const point of model.data) {
      expect(Number.isFinite(point.memoryBandwidthGbps)).toBe(true);
      expect(Number.isFinite(point.maximumThroughputBoundary)).toBe(true);
      expect(point.maximumThroughputBoundary).toBeGreaterThanOrEqual(0);
    }
  });

  test("updates active scenario and boundary when bytes per parameter changes", () => {
    const lowPrecisionModel = buildRooflineThroughputChartModel({
      activeWeightSizeBillions: 27,
      bytesPerParameter: 2,
      memoryBandwidthGbps: 1000,
    });
    const highPrecisionModel = buildRooflineThroughputChartModel({
      activeWeightSizeBillions: 27,
      bytesPerParameter: 8,
      memoryBandwidthGbps: 1000,
    });

    expect(lowPrecisionModel.kind).toBe("valid");
    expect(highPrecisionModel.kind).toBe("valid");
    if (
      lowPrecisionModel.kind !== "valid" ||
      highPrecisionModel.kind !== "valid"
    ) {
      return;
    }

    expect(lowPrecisionModel.activePoint.decodeTokensPerSecond).toBeGreaterThan(
      highPrecisionModel.activePoint.decodeTokensPerSecond,
    );
    expect(
      lowPrecisionModel.data.at(-1)?.maximumThroughputBoundary,
    ).toBeGreaterThan(
      highPrecisionModel.data.at(-1)?.maximumThroughputBoundary ?? 0,
    );
  });

  test("updates active scenario when active weight size changes", () => {
    const smallModel = buildRooflineThroughputChartModel({
      activeWeightSizeBillions: 7,
      bytesPerParameter: 2,
      memoryBandwidthGbps: 1000,
    });
    const largeModel = buildRooflineThroughputChartModel({
      activeWeightSizeBillions: 70,
      bytesPerParameter: 2,
      memoryBandwidthGbps: 1000,
    });

    expect(smallModel.kind).toBe("valid");
    expect(largeModel.kind).toBe("valid");
    if (smallModel.kind !== "valid" || largeModel.kind !== "valid") {
      return;
    }

    expect(smallModel.activePoint.decodeTokensPerSecond).toBeGreaterThan(
      largeModel.activePoint.decodeTokensPerSecond,
    );
    expect(smallModel.data.at(-1)?.maximumThroughputBoundary).toBeGreaterThan(
      largeModel.data.at(-1)?.maximumThroughputBoundary ?? 0,
    );
  });

  test("returns typed invalid state for incomplete inputs", () => {
    expect(
      buildRooflineThroughputChartModel({
        activeWeightSizeBillions: 27,
        bytesPerParameter: 2,
      }),
    ).toEqual({
      kind: "invalid",
      reason: "missing-memory-bandwidth",
      field: "memoryBandwidthGbps",
    });
  });
});

describe("roofline chart formatters", () => {
  test("formats bandwidth and decode throughput labels for chart ticks", () => {
    expect(formatRooflineBandwidthGbps(1500)).toBe("1.5k");
    expect(formatRooflineDecodeTokensPerSecond(2500)).toBe("2.5k");
    expect(formatRooflineDecodeTokensPerSecond(42)).toBe("42");
  });
});
