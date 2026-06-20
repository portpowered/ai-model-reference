import { describe, expect, test } from "bun:test";
import type { ClassificationRecord } from "@/lib/content/schemas";
import {
  listTopologyNavigationOptions,
  TOPOLOGY_SEED_PARENT_CLASSIFICATION_ID,
} from "@/lib/content/topology-navigation";

function publishedClassification(
  overrides: Partial<ClassificationRecord>,
): ClassificationRecord {
  return {
    id: "classification.example",
    slug: "example",
    kind: "classification",
    defaultTitleKey: "title",
    defaultSummaryKey: "description",
    aliases: [],
    tags: [],
    relatedIds: [],
    citationIds: [],
    status: "published",
    createdAt: "2026-06-20T00:00:00.000Z",
    updatedAt: "2026-06-20T00:00:00.000Z",
    classificationType: "family",
    classifiesKinds: ["concept", "module"],
    parentClassificationId: TOPOLOGY_SEED_PARENT_CLASSIFICATION_ID,
    ...overrides,
  };
}

describe("topology navigation model", () => {
  test("derives graph-map and timeline destinations from seeded classifications", () => {
    const options = listTopologyNavigationOptions();

    expect(options.map((option) => option.classificationId)).toEqual([
      "classification.activation-functions",
      "classification.feed-forward-networks",
    ]);
    expect(options.map((option) => option.classificationSlug)).toEqual([
      "activation-functions",
      "feed-forward-networks",
    ]);
    expect(options.map((option) => option.label)).toEqual([
      "Activation Functions",
      "Feed Forward Networks",
    ]);

    const activation = options.find(
      (option) =>
        option.classificationId === "classification.activation-functions",
    );
    expect(activation?.memberCount).toBeGreaterThan(0);
    expect(activation?.destinations).toEqual([
      {
        mode: "graph-map",
        label: "Graph map",
        href: "/browse?classification=activation-functions&mode=graph-map",
      },
      {
        mode: "timeline",
        label: "Timeline",
        href: "/browse?classification=activation-functions&mode=timeline",
      },
    ]);

    const feedForward = options.find(
      (option) =>
        option.classificationId === "classification.feed-forward-networks",
    );
    expect(feedForward?.memberCount).toBeGreaterThan(0);
    expect(feedForward?.destinations).toEqual([
      {
        mode: "graph-map",
        label: "Graph map",
        href: "/browse?classification=feed-forward-networks&mode=graph-map",
      },
      {
        mode: "timeline",
        label: "Timeline",
        href: "/browse?classification=feed-forward-networks&mode=timeline",
      },
    ]);
  });

  test("preserves locale-aware browse routes in destination URLs", () => {
    const options = listTopologyNavigationOptions({ locale: "vi" });

    expect(options[0]?.destinations).toContainEqual({
      mode: "graph-map",
      label: "Graph map",
      href: "/vi/browse?classification=activation-functions&mode=graph-map",
    });
    expect(options[1]?.destinations).toContainEqual({
      mode: "timeline",
      label: "Timeline",
      href: "/vi/browse?classification=feed-forward-networks&mode=timeline",
    });
  });

  test("returns an empty model when no eligible seed classifications exist", () => {
    expect(listTopologyNavigationOptions({ classifications: [] })).toEqual([]);

    expect(
      listTopologyNavigationOptions({
        classifications: [
          publishedClassification({
            id: "classification.domain-root",
            slug: "domain-root",
            parentClassificationId: undefined,
          }),
          publishedClassification({
            id: "classification.unpublished-seed",
            slug: "unpublished-seed",
            status: "draft",
          }),
          publishedClassification({
            id: "classification.no-members",
            slug: "no-members",
          }),
        ],
        listMembers: () => [],
      }),
    ).toEqual([]);
  });
});
