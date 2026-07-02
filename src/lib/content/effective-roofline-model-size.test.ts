import { describe, expect, test } from "bun:test";
import { getModelById } from "@/lib/content/registry-runtime";
import { resolveEffectiveRooflineModelSize } from "./effective-roofline-model-size";

describe("resolveEffectiveRooflineModelSize", () => {
  test("prefers active parameter count when both active and total metadata are supported", () => {
    expect(
      resolveEffectiveRooflineModelSize({
        parameterCount: "744 billion total parameters",
        activeParameterCount: "40 billion active parameters",
      }),
    ).toBe(40);
  });

  test("resolves GLM-5.2 from registry active parameters, not total size", () => {
    const model = getModelById("model.glm-5-2");
    if (!model) {
      throw new Error("expected GLM-5.2 model record in registry");
    }
    expect(resolveEffectiveRooflineModelSize(model)).toBe(40);
  });

  test("resolves DeepSeek-V4-Pro from registry active parameters, not total size", () => {
    const model = getModelById("model.deepseek-v4-pro");
    if (!model) {
      throw new Error("expected DeepSeek-V4-Pro model record in registry");
    }
    expect(resolveEffectiveRooflineModelSize(model)).toBe(37);
  });

  test("resolves Qwen3.6-35B-A3B from registry active parameters, not total size", () => {
    const model = getModelById("model.qwen-3-6-35b-a3b");
    if (!model) {
      throw new Error("expected Qwen3.6-35B-A3B model record in registry");
    }
    expect(resolveEffectiveRooflineModelSize(model)).toBe(3);
  });

  test("falls back to parameterCount for dense models without active metadata", () => {
    expect(
      resolveEffectiveRooflineModelSize({
        parameterCount: "27 billion parameters",
      }),
    ).toBe(27);
    expect(
      resolveEffectiveRooflineModelSize({
        parameterCount: "0.6 billion parameters",
      }),
    ).toBe(0.6);
  });

  test("resolves dense Qwen3.6-27B and Qwen3-0.6B from registry parameterCount", () => {
    const qwen27b = getModelById("model.qwen-3-6-27b");
    const qwen06b = getModelById("model.qwen3-0-6b");

    if (!qwen27b || !qwen06b) {
      throw new Error(
        "expected Qwen3.6-27B and Qwen3-0.6B model records in registry",
      );
    }
    expect(resolveEffectiveRooflineModelSize(qwen27b)).toBe(27);
    expect(resolveEffectiveRooflineModelSize(qwen06b)).toBe(0.6);
  });

  test("returns null when neither active nor dense parameter metadata is supported", () => {
    expect(
      resolveEffectiveRooflineModelSize({
        parameterCount: "about 27B parameters",
        activeParameterCount: "not a parameter count",
      }),
    ).toBeNull();
    expect(resolveEffectiveRooflineModelSize({})).toBeNull();
  });

  test("falls back to supported parameterCount when active metadata is unsupported", () => {
    expect(
      resolveEffectiveRooflineModelSize({
        parameterCount: "27 billion parameters",
        activeParameterCount: "about 3B active",
      }),
    ).toBe(27);
  });
});
