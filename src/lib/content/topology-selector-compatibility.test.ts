import { describe, expect, test } from "bun:test";
import {
  listTopologyCompatibilitySelectorEntries,
  resolveTopologyCompatibilityClassificationId,
} from "@/lib/content/topology-selector-compatibility";

describe("topology selector compatibility fence", () => {
  test("declares the current temporary compatibility selector set in one place", () => {
    expect(listTopologyCompatibilitySelectorEntries()).toEqual([
      {
        selector: "classification.activation-functions",
        classificationId: "classification.module.activation",
      },
      {
        selector: "classification.attention-mechanisms",
        classificationId: "classification.module.attention",
      },
      {
        selector: "classification.feed-forward-networks",
        classificationId: "classification.module.feed-forward",
      },
      {
        selector: "classification.normalization-layers",
        classificationId: "classification.module.normalization",
      },
      {
        selector: "classification.position-encoding-methods",
        classificationId: "classification.module.positional-encoding",
      },
      {
        selector: "classification.tokenization-methods",
        classificationId: "classification.module.tokenization",
      },
      {
        selector: "classification.transformer-block-structures",
        classificationId: "classification.module.transformer-block",
      },
      {
        selector: "activation",
        classificationId: "classification.module.activation",
      },
      {
        selector: "activation-function",
        classificationId: "classification.module.activation",
      },
      {
        selector: "feed-forward",
        classificationId: "classification.module.feed-forward",
      },
      {
        selector: "feed-forward-network",
        classificationId: "classification.module.feed-forward",
      },
    ]);
  });

  test("resolves each supported compatibility selector to one canonical classification id", () => {
    for (const entry of listTopologyCompatibilitySelectorEntries()) {
      expect(resolveTopologyCompatibilityClassificationId(entry.selector)).toBe(
        entry.classificationId,
      );
    }
  });

  test("rejects unsupported selectors outside the explicit fence", () => {
    expect(resolveTopologyCompatibilityClassificationId("attention")).toBe(
      undefined,
    );
    expect(resolveTopologyCompatibilityClassificationId("feed-forwards")).toBe(
      undefined,
    );
  });
});
