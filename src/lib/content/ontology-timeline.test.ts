import { describe, expect, test } from "bun:test";
import {
  buildOntologyTimelineDataFromSources,
  loadOntologyTimelineData,
} from "@/lib/content/ontology-timeline";
import { loadPublishedDocsPagesSync } from "@/lib/content/pages";
import {
  listClassificationRecords,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";

describe("ontology timeline data", () => {
  test("accepts canonical ids, canonical slugs, and explicit compatibility selectors for the active slice", () => {
    const canonicalIdTimeline = loadOntologyTimelineData(
      "classification.module.feed-forward",
    );
    const canonicalSlugTimeline = loadOntologyTimelineData(
      "feed-forward-networks",
    );
    const legacyIdTimeline = loadOntologyTimelineData(
      "classification.feed-forward-networks",
    );
    const shorthandTimeline = loadOntologyTimelineData("feed-forward");

    expect(canonicalIdTimeline.status).toBe("success");
    expect(canonicalSlugTimeline.status).toBe("success");
    expect(legacyIdTimeline.status).toBe("success");
    expect(shorthandTimeline.status).toBe("success");

    for (const timeline of [
      canonicalIdTimeline,
      canonicalSlugTimeline,
      legacyIdTimeline,
      shorthandTimeline,
    ]) {
      if (timeline.status !== "success") {
        throw new Error("Expected feed-forward timeline to resolve");
      }

      expect(timeline.classification.classificationId).toBe(
        "classification.module.feed-forward",
      );
      expect(timeline.items.map((item) => item.registryId)).toEqual([
        "module.feed-forward-network",
        "module.mixture-of-experts",
        "module.standard-ffn",
        "module.swiglu",
        "module.deepseekmoe",
      ]);
    }
  });

  test("rejects unsupported shorthand selectors outside the explicit compatibility set", () => {
    expect(loadOntologyTimelineData("attention")).toEqual({
      status: "empty",
      reason: "unknown-classification",
      requestedClassification: "attention",
      items: [],
      nearbyClassifications: [],
    });
  });

  test("activation resolves from the reader-facing slug and returns dated chronology items", () => {
    const timeline = loadOntologyTimelineData("activation");

    expect(timeline.status).toBe("success");
    if (timeline.status !== "success") {
      throw new Error("Expected activation timeline to resolve successfully");
    }

    expect(timeline.classification.classificationId).toBe(
      "classification.module.activation",
    );
    expect(timeline.items.map((item) => item.registryId)).toEqual([
      "module.tanh",
      "module.sigmoid",
      "module.relu",
      "module.leaky-relu",
      "module.gelu",
      "module.silu",
    ]);

    const relu = timeline.items.find(
      (item) => item.registryId === "module.relu",
    );
    expect(relu).toMatchObject({
      dateValue: "2010-01-01",
      dateLabel: "2010",
      title: "Rectified Linear Unit",
      summary:
        "A simple activation function that keeps positive values and turns negative values into zero.",
      href: "/docs/modules/relu",
    });
    expect(relu?.classificationMemberships).toContainEqual({
      classificationId: "classification.module.activation",
      classificationSlug: "activation-functions",
      classificationTitle: "activation function",
      membershipType: "primary",
    });
  });

  test("activation timeline is sorted from earliest to latest with deterministic records", () => {
    const timeline = loadOntologyTimelineData("activation-functions");

    expect(timeline.status).toBe("success");
    if (timeline.status !== "success") {
      throw new Error("Expected activation timeline to resolve successfully");
    }

    const orderedDates = timeline.items.map((item) => item.dateValue);
    expect(orderedDates).toEqual([...orderedDates].sort());
    expect(timeline.items[0]?.registryId).toBe("module.tanh");
    expect(
      timeline.items.findIndex((item) => item.registryId === "module.relu"),
    ).toBeLessThan(
      timeline.items.findIndex(
        (item) => item.registryId === "module.leaky-relu",
      ),
    );
    expect(
      timeline.items.findIndex((item) => item.registryId === "module.silu"),
    ).toBe(timeline.items.length - 1);
    expect(
      timeline.items.every((item) =>
        item.classificationMemberships.some(
          (membership) =>
            membership.classificationId ===
              "classification.module.activation" &&
            membership.membershipType === "primary",
        ),
      ),
    ).toBe(true);
  });

  test("timelines keep activation and feed-forward records isolated by primary classification", () => {
    const timeline = loadOntologyTimelineData("activation");
    const feedForwardTimeline = loadOntologyTimelineData(
      "feed-forward-networks",
    );

    expect(timeline.status).toBe("success");
    if (timeline.status !== "success") {
      throw new Error("Expected activation timeline to resolve successfully");
    }
    if (feedForwardTimeline.status !== "success") {
      throw new Error("Expected feed-forward timeline to resolve successfully");
    }

    expect(timeline.items.map((item) => item.registryId)).not.toEqual(
      expect.arrayContaining([
        "module.feed-forward-network",
        "module.standard-ffn",
        "module.swiglu",
      ]),
    );
    expect(feedForwardTimeline.items.map((item) => item.registryId)).toEqual([
      "module.feed-forward-network",
      "module.mixture-of-experts",
      "module.standard-ffn",
      "module.swiglu",
      "module.deepseekmoe",
    ]);
    expect(
      feedForwardTimeline.items.every((item) =>
        item.classificationMemberships.some(
          (membership) =>
            membership.classificationId ===
              "classification.module.feed-forward" &&
            membership.membershipType === "primary",
        ),
      ),
    ).toBe(true);

    expect(timeline.nearbyClassifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          classificationId: "classification.module.activation",
          eventCount: timeline.items.length,
          active: true,
        }),
        expect.objectContaining({
          classificationId: "classification.module.attention",
          active: false,
        }),
        expect.objectContaining({
          classificationId: "classification.module.normalization",
          active: false,
        }),
        expect.objectContaining({
          classificationId: "classification.module.positional-encoding",
          active: false,
        }),
        expect.objectContaining({
          classificationId: "classification.module.tokenization",
          active: false,
        }),
      ]),
    );
  });

  test("unknown classifications return a typed empty result", () => {
    expect(loadOntologyTimelineData("missing-classification")).toEqual({
      status: "empty",
      reason: "unknown-classification",
      requestedClassification: "missing-classification",
      items: [],
      nearbyClassifications: [],
    });
  });

  test("known classifications without dated records return a typed empty result", () => {
    const activationTimeline = loadOntologyTimelineData("activation");

    expect(activationTimeline.status).toBe("success");
    if (activationTimeline.status !== "success") {
      throw new Error("Expected activation timeline to resolve successfully");
    }

    const undatedRegistryIds = new Set(
      activationTimeline.items.map((item) => item.registryId),
    );
    const timeline = buildOntologyTimelineDataFromSources({
      classification: "activation",
      pages: loadPublishedDocsPagesSync("en"),
      classifications: listClassificationRecords(),
      records: listRelatedRegistryRecords().map((record) => {
        if (record.kind === "module" && undatedRegistryIds.has(record.id)) {
          return {
            ...record,
            releaseDate: undefined,
          };
        }
        return record;
      }),
    });

    expect(timeline).toMatchObject({
      status: "empty",
      reason: "undated-classification",
      requestedClassification: "activation",
      items: [],
    });
    expect(timeline.classification?.classificationId).toBe(
      "classification.module.activation",
    );
  });

  test("non-default locales fall back to default docs page metadata for unshipped pages", () => {
    const timeline = loadOntologyTimelineData("activation", "ja");

    expect(timeline.status).toBe("success");
    if (timeline.status !== "success") {
      throw new Error("Expected activation timeline to resolve successfully");
    }

    const relu = timeline.items.find(
      (item) => item.registryId === "module.relu",
    );
    expect(relu).toMatchObject({
      title: "Rectified Linear Unit",
      href: "/docs/modules/relu",
    });
  });
});
