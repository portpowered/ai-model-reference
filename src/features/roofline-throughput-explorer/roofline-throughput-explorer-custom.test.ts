import { describe, expect, test } from "bun:test";
import {
  controlRegionsOverlap,
  ROOFLINE_CUSTOM_ACTIVE_WEIGHT_ERROR,
  ROOFLINE_CUSTOM_BATCH_SIZE_ERROR,
  ROOFLINE_CUSTOM_QUANTIZATION_BITS_ERROR,
  rectsOverlap,
  validateCustomActiveWeightSizeBillions,
  validateCustomBatchSize,
  validateCustomQuantizationBits,
} from "./roofline-throughput-explorer-custom";

function rect(
  left: number,
  top: number,
  width: number,
  height: number,
): DOMRect {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

describe("roofline-throughput-explorer-custom", () => {
  test("validates custom active weight, quantization, and batch inputs", () => {
    expect(validateCustomActiveWeightSizeBillions("12.5")).toEqual({
      kind: "valid",
      value: 12.5,
    });
    expect(validateCustomActiveWeightSizeBillions("")).toEqual({
      kind: "invalid",
      message: ROOFLINE_CUSTOM_ACTIVE_WEIGHT_ERROR,
    });
    expect(validateCustomActiveWeightSizeBillions("-1")).toEqual({
      kind: "invalid",
      message: ROOFLINE_CUSTOM_ACTIVE_WEIGHT_ERROR,
    });

    expect(validateCustomQuantizationBits("4")).toEqual({
      kind: "valid",
      value: 4,
    });
    expect(validateCustomQuantizationBits("0")).toEqual({
      kind: "invalid",
      message: ROOFLINE_CUSTOM_QUANTIZATION_BITS_ERROR,
    });
    expect(validateCustomQuantizationBits("17")).toEqual({
      kind: "invalid",
      message: ROOFLINE_CUSTOM_QUANTIZATION_BITS_ERROR,
    });
    expect(validateCustomQuantizationBits("abc")).toEqual({
      kind: "invalid",
      message: ROOFLINE_CUSTOM_QUANTIZATION_BITS_ERROR,
    });

    expect(validateCustomBatchSize("8")).toEqual({
      kind: "valid",
      value: 8,
    });
    expect(validateCustomBatchSize("0")).toEqual({
      kind: "invalid",
      message: ROOFLINE_CUSTOM_BATCH_SIZE_ERROR,
    });
    expect(validateCustomBatchSize("257")).toEqual({
      kind: "invalid",
      message: ROOFLINE_CUSTOM_BATCH_SIZE_ERROR,
    });
  });

  test("detects overlapping control regions", () => {
    expect(rectsOverlap(rect(0, 0, 100, 40), rect(80, 10, 100, 40))).toBe(true);
    expect(rectsOverlap(rect(0, 0, 100, 40), rect(0, 50, 100, 40))).toBe(false);
    expect(
      controlRegionsOverlap([
        rect(0, 0, 320, 48),
        rect(0, 64, 320, 48),
        rect(0, 128, 320, 48),
      ]),
    ).toBe(false);
    expect(
      controlRegionsOverlap([rect(0, 0, 320, 48), rect(0, 20, 320, 48)]),
    ).toBe(true);
  });
});
