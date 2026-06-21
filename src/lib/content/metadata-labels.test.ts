import { describe, expect, test } from "bun:test";
import {
  deriveOntologyMetadataLabels,
  formatMetadataToken,
} from "@/lib/content/metadata-labels";
import {
  getModuleById,
  getSystemById,
  getTrainingRegimeById,
} from "@/lib/content/registry-runtime";

function requireValue<T>(value: T | undefined, label: string): T {
  expect(value).toBeDefined();

  if (value === undefined) {
    throw new Error(`${label} should exist in the registry runtime`);
  }

  return value;
}

describe("metadata-labels", () => {
  test("formats hyphenated metadata tokens for reader-facing display", () => {
    expect(formatMetadataToken("feed-forward-networks")).toBe(
      "Feed Forward Networks",
    );
  });

  test("derives a module classification label from ontology membership", () => {
    const record = requireValue(
      getModuleById("module.deepseekmoe"),
      "module.deepseekmoe",
    );

    expect(deriveOntologyMetadataLabels(record)).toEqual({
      primaryLabel: "Feed Forward Networks",
      secondaryLabels: [],
    });
  });

  test("derives stable module labels for activation and feed-forward proving records", () => {
    const activationRecord = requireValue(
      getModuleById("module.silu"),
      "module.silu",
    );
    const feedForwardRecord = requireValue(
      getModuleById("module.swiglu"),
      "module.swiglu",
    );

    expect(deriveOntologyMetadataLabels(activationRecord)).toEqual({
      primaryLabel: "Activation Functions",
      secondaryLabels: [],
    });
    expect(deriveOntologyMetadataLabels(feedForwardRecord)).toEqual({
      primaryLabel: "Feed Forward Networks",
      secondaryLabels: [],
    });
  });

  test("derives a training regime classification label from ontology membership", () => {
    const record = requireValue(
      getTrainingRegimeById("training-regime.dpo"),
      "training-regime.dpo",
    );

    expect(deriveOntologyMetadataLabels(record)).toEqual({
      primaryLabel: "Training Alignment",
      secondaryLabels: [],
    });
  });

  test("derives a system classification label from ontology membership", () => {
    const record = requireValue(
      getSystemById("system.routing"),
      "system.routing",
    );

    expect(deriveOntologyMetadataLabels(record)).toEqual({
      primaryLabel: "System Routing",
      secondaryLabels: [],
    });
  });
});
