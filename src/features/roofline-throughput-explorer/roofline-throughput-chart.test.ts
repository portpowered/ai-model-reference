import { describe, expect, test } from "bun:test";
import { DEFAULT_ROOFLINE_BANDWIDTH_DOMAIN_GBPS } from "./roofline-throughput-calculation";
import {
  buildRooflineThroughputChartModel,
  formatRooflineBandwidthGbps,
  formatRooflineDecodeTokensPerSecond,
  formatRooflineFlopsPerSecond,
  ROOFLINE_THROUGHPUT_GUIDE_TOKENS_PER_SECOND,
} from "./roofline-throughput-chart";

describe("buildRooflineThroughputChartModel", () => {
  test("returns boundary series and active throughput for valid inputs", () => {
    const model = buildRooflineThroughputChartModel({
      activeWeightSizeBillions: 27,
      quantizationBits: 16,
      memoryBandwidthGbps: 1000,
    });

    expect(model.kind).toBe("valid");
    if (model.kind !== "valid") {
      return;
    }

    expect(model.data.length).toBeGreaterThan(100);
    expect(model.xDomain[0]).toBe(DEFAULT_ROOFLINE_BANDWIDTH_DOMAIN_GBPS[0]);
    expect(model.xDomain[1]).toBeGreaterThan(
      DEFAULT_ROOFLINE_BANDWIDTH_DOMAIN_GBPS[1],
    );
    expect(model.yDomain[0]).toBeGreaterThan(0);
    expect(model.yDomain[1]).toBeGreaterThan(0);
    expect(model.activePoint.memoryBandwidthGbps).toBe(1000);
    expect(model.activePoint.decodeTokensPerSecond).toBeGreaterThan(0);
    expect(
      model.guidePoints.map((point) => point.maximumDecodeTokensPerSecond),
    ).toEqual([...ROOFLINE_THROUGHPUT_GUIDE_TOKENS_PER_SECOND]);
    expect(model.guidePoints.map((point) => point.label)).toEqual([
      "20",
      "50",
      "75",
      "100",
      "200",
    ]);
    for (const guidePoint of model.guidePoints) {
      expect(guidePoint.memoryBandwidthGbps).toBeGreaterThan(0);
      expect(guidePoint.boundaryComputeFlopsPerSecond).toBeGreaterThan(0);
    }
    expect(model.hostPoints.map((host) => host.label)).toEqual([
      "Huawei Ascend 910C",
      "M1 Pro",
      "M1 Max",
      "M1 Ultra",
      "M2 Max",
      "M2 Ultra",
      "M3",
      "M3 Max",
      "M3 Ultra",
      "M4",
      "M4 Max",
      "M4 Ultra",
      "M5",
      "M5 Max",
      "M5 Ultra",
      "DGX Spark",
      "RTX 4090",
      "RTX 5090",
      "H100 SXM",
      "H200 SXM",
      "GB300",
      "RTX 4000 Ada",
      "RTX 4500 Ada",
      "RTX 5000 Ada",
      "RTX 6000 Ada",
      "RTX PRO 6000 Blackwell",
      "AMD Strix Halo",
      "Intel Arc B570",
      "Intel Arc B580",
      "Vera Rubin",
    ]);

    for (const point of model.data) {
      expect(Number.isFinite(point.memoryBandwidthGbps)).toBe(true);
      expect(Number.isFinite(point.boundaryComputeFlopsPerSecond)).toBe(true);
      expect(point.boundaryComputeFlopsPerSecond).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(point.maximumDecodeTokensPerSecond)).toBe(true);
      expect(point.maximumDecodeTokensPerSecond).toBeGreaterThanOrEqual(0);
    }
  });

  test("updates throughput and boundary when quantization bits changes", () => {
    const lowPrecisionModel = buildRooflineThroughputChartModel({
      activeWeightSizeBillions: 27,
      quantizationBits: 8,
      memoryBandwidthGbps: 1000,
    });
    const highPrecisionModel = buildRooflineThroughputChartModel({
      activeWeightSizeBillions: 27,
      quantizationBits: 16,
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
      lowPrecisionModel.data.at(-1)?.boundaryComputeFlopsPerSecond,
    ).toBeGreaterThan(
      highPrecisionModel.data.at(-1)?.boundaryComputeFlopsPerSecond ?? 0,
    );
    expect(
      lowPrecisionModel.data.at(-1)?.maximumDecodeTokensPerSecond,
    ).toBeGreaterThan(
      highPrecisionModel.data.at(-1)?.maximumDecodeTokensPerSecond ?? 0,
    );
    expect(
      lowPrecisionModel.hostPoints.find((host) => host.id === "h100")
        ?.maximumDecodeTokensPerSecond,
    ).toBeGreaterThan(
      highPrecisionModel.hostPoints.find((host) => host.id === "h100")
        ?.maximumDecodeTokensPerSecond ?? 0,
    );
  });

  test("updates throughput when active weight size changes", () => {
    const smallModel = buildRooflineThroughputChartModel({
      activeWeightSizeBillions: 7,
      quantizationBits: 16,
      memoryBandwidthGbps: 1000,
    });
    const largeModel = buildRooflineThroughputChartModel({
      activeWeightSizeBillions: 70,
      quantizationBits: 16,
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
    expect(smallModel.data.at(-1)?.boundaryComputeFlopsPerSecond).toBe(
      largeModel.data.at(-1)?.boundaryComputeFlopsPerSecond,
    );
    expect(smallModel.data.at(-1)?.maximumDecodeTokensPerSecond).toBeGreaterThan(
      largeModel.data.at(-1)?.maximumDecodeTokensPerSecond ?? 0,
    );
  });

  test("moves the boundary upward when batch size increases", () => {
    const batchOneModel = buildRooflineThroughputChartModel({
      activeWeightSizeBillions: 27,
      batchSize: 1,
      quantizationBits: 16,
      memoryBandwidthGbps: 1000,
    });
    const batchEightModel = buildRooflineThroughputChartModel({
      activeWeightSizeBillions: 27,
      batchSize: 8,
      quantizationBits: 16,
      memoryBandwidthGbps: 1000,
    });

    expect(batchOneModel.kind).toBe("valid");
    expect(batchEightModel.kind).toBe("valid");
    if (batchOneModel.kind !== "valid" || batchEightModel.kind !== "valid") {
      return;
    }

    expect(batchEightModel.activePoint.decodeTokensPerSecond).toBeGreaterThan(
      batchOneModel.activePoint.decodeTokensPerSecond,
    );
    expect(
      batchEightModel.data.at(-1)?.boundaryComputeFlopsPerSecond,
    ).toBeGreaterThan(
      batchOneModel.data.at(-1)?.boundaryComputeFlopsPerSecond ?? 0,
    );
    expect(
      batchEightModel.hostPoints.find((host) => host.id === "m1-ultra")
        ?.maximumDecodeTokensPerSecond,
    ).toBeGreaterThan(
      batchOneModel.hostPoints.find((host) => host.id === "m1-ultra")
        ?.maximumDecodeTokensPerSecond ?? 0,
    );
  });

  test("scales y domain to the sampled boundary without an active scenario dot", () => {
    const model = buildRooflineThroughputChartModel({
      activeWeightSizeBillions: 1,
      quantizationBits: 16,
      memoryBandwidthGbps: 1000,
      peakComputeFlopsPerSecond: 500e12,
    });

    expect(model.kind).toBe("valid");
    if (model.kind !== "valid") {
      return;
    }

    const plottedValues = [
      ...model.data.map((point) => point.boundaryComputeFlopsPerSecond),
      ...model.hostPoints.map((point) => point.computeFlopsPerSecond),
    ].filter((value) => value > 0);
    const plottedMin = Math.min(...plottedValues);
    const plottedMax = Math.max(...plottedValues);

    expect(model.yDomain).toEqual([
      Math.max(1, plottedMin * 0.85),
      plottedMax * 1.15,
    ]);
    expect(model.yDomain[0]).toBeGreaterThan(0);
    expect(model.yDomain[1]).toBeGreaterThan(
      model.yDomain[0],
    );
  });

  test("returns typed invalid state for incomplete inputs", () => {
    expect(
      buildRooflineThroughputChartModel({
        activeWeightSizeBillions: 27,
        quantizationBits: 16,
      }),
    ).toEqual({
      kind: "invalid",
      reason: "missing-memory-bandwidth",
      field: "memoryBandwidthGbps",
    });
  });
});

describe("roofline chart formatters", () => {
  test("formats bandwidth, decode throughput, and FLOP/s labels for chart ticks", () => {
    expect(formatRooflineBandwidthGbps(1500)).toBe("1.5k");
    expect(formatRooflineDecodeTokensPerSecond(2500)).toBe("2.5k");
    expect(formatRooflineDecodeTokensPerSecond(42)).toBe("42");
    expect(formatRooflineFlopsPerSecond(2.5e12)).toBe("2.5T");
    expect(formatRooflineFlopsPerSecond(1e15)).toBe("1P");
  });
});
