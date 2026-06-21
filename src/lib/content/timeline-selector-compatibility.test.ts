import { describe, expect, test } from "bun:test";
import { listClassificationRecords } from "@/lib/content/registry-runtime";
import {
  listSupportedTimelineClassificationSelectors,
  listTimelineCompatibilitySelectorEntries,
  resolveTimelineClassificationSelector,
  resolveTimelineCompatibilityClassificationId,
} from "@/lib/content/timeline-selector-compatibility";

describe("timeline selector compatibility fence", () => {
  test("declares the approved temporary timeline compatibility selectors in one place", () => {
    expect(listTimelineCompatibilitySelectorEntries()).toEqual([
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

  test("resolves canonical and approved compatibility selectors to the same canonical timeline classification", () => {
    const classifications = listClassificationRecords();
    const resolvedIds = [
      "classification.module.feed-forward",
      "feed-forward-networks",
      "classification.feed-forward-networks",
      "feed-forward",
    ].map(
      (selector) =>
        resolveTimelineClassificationSelector(selector, classifications)?.id,
    );

    expect(resolvedIds).toEqual([
      "classification.module.feed-forward",
      "classification.module.feed-forward",
      "classification.module.feed-forward",
      "classification.module.feed-forward",
    ]);
  });

  test("rejects undeclared compatibility near misses", () => {
    const classifications = listClassificationRecords();

    expect(resolveTimelineCompatibilityClassificationId("attention")).toBe(
      undefined,
    );
    expect(resolveTimelineCompatibilityClassificationId("feed-forwards")).toBe(
      undefined,
    );
    expect(
      resolveTimelineClassificationSelector(
        "classification.activation",
        classifications,
      ),
    ).toBe(undefined);
  });

  test("preload registration can enumerate the same approved selector set", () => {
    const feedForward = listClassificationRecords().find(
      (classification) =>
        classification.id === "classification.module.feed-forward",
    );

    expect(feedForward).toBeDefined();
    if (!feedForward) {
      throw new Error("Expected feed-forward classification");
    }

    expect(listSupportedTimelineClassificationSelectors(feedForward)).toEqual([
      "classification.module.feed-forward",
      "feed-forward-networks",
      "classification.feed-forward-networks",
      "feed-forward",
      "feed-forward-network",
    ]);
  });
});
