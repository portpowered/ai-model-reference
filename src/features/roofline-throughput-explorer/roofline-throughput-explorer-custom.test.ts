import { describe, expect, test } from "bun:test";
import {
  controlRegionsOverlap,
  ROOFLINE_CUSTOM_ACTIVE_WEIGHT_ERROR,
  ROOFLINE_CUSTOM_BYTES_PER_PARAMETER_ERROR,
  rectsOverlap,
  validateCustomActiveWeightSizeBillions,
  validateCustomBytesPerParameter,
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
  test("validates custom active weight and bytes-per-parameter inputs", () => {
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

    expect(validateCustomBytesPerParameter("4")).toEqual({
      kind: "valid",
      value: 4,
    });
    expect(validateCustomBytesPerParameter("0")).toEqual({
      kind: "invalid",
      message: ROOFLINE_CUSTOM_BYTES_PER_PARAMETER_ERROR,
    });
    expect(validateCustomBytesPerParameter("9")).toEqual({
      kind: "invalid",
      message: ROOFLINE_CUSTOM_BYTES_PER_PARAMETER_ERROR,
    });
    expect(validateCustomBytesPerParameter("abc")).toEqual({
      kind: "invalid",
      message: ROOFLINE_CUSTOM_BYTES_PER_PARAMETER_ERROR,
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
