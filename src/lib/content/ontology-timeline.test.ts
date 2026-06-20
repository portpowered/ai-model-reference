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
  test("activation resolves from the reader-facing slug and returns dated chronology items", () => {
    const timeline = loadOntologyTimelineData("activation");

    expect(timeline.status).toBe("success");
    if (timeline.status !== "success") {
      throw new Error("Expected activation timeline to resolve successfully");
    }

    expect(timeline.classification.classificationId).toBe(
      "classification.activation-functions",
    );
    expect(timeline.items.map((item) => item.registryId)).toEqual(
      expect.arrayContaining([
        "module.relu",
        "module.leaky-relu",
        "module.silu",
        "module.swiglu",
      ]),
    );

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
      classificationId: "classification.activation-functions",
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
    expect(timeline.items.map((item) => item.registryId)).toEqual([
      "module.feed-forward-network",
      "module.relu",
      "module.leaky-relu",
      "module.silu",
      "module.standard-ffn",
      "module.swiglu",
    ]);
  });

  test("relationship-derived activation neighbors carry typed context and nearby slices", () => {
    const timeline = loadOntologyTimelineData("activation");

    expect(timeline.status).toBe("success");
    if (timeline.status !== "success") {
      throw new Error("Expected activation timeline to resolve successfully");
    }

    const swiglu = timeline.items.find(
      (item) => item.registryId === "module.swiglu",
    );
    expect(swiglu?.classificationMemberships).toContainEqual({
      classificationId: "classification.feed-forward-networks",
      classificationSlug: "feed-forward-networks",
      classificationTitle: "feed-forward network",
      membershipType: "primary",
    });
    expect(swiglu?.relationshipContext).toContainEqual({
      relationshipType: "used-by",
      sourceId: "module.silu",
      sourceTitle: "Sigmoid Linear Unit",
      targetId: "module.swiglu",
      targetTitle: "Swish Gated Linear Unit",
    });

    expect(timeline.nearbyClassifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          classificationId: "classification.activation-functions",
          active: true,
        }),
        expect.objectContaining({
          classificationId: "classification.feed-forward-networks",
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
    const undatedRegistryIds = new Set([
      "module.relu",
      "module.leaky-relu",
      "module.silu",
      "module.swiglu",
      "module.standard-ffn",
      "module.feed-forward-network",
    ]);
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
      "classification.activation-functions",
    );
  });
});
