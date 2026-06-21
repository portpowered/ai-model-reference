import { describe, expect, test } from "bun:test";
import type { ClassificationTreeClassificationNode } from "@/lib/content/registry-runtime";
import {
  getTopologyNavigationLabels,
  listTopologyNavigationOptions,
  TOPOLOGY_SEED_PARENT_CLASSIFICATION_ID,
} from "@/lib/content/topology-navigation";
import { loadUiMessages } from "@/lib/content/ui-messages";

function publishedClassificationNode(
  overrides: Partial<ClassificationTreeClassificationNode>,
): ClassificationTreeClassificationNode {
  return {
    nodeType: "classification",
    classification: {
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
      classifiesKinds: ["module"],
      parentClassificationId: TOPOLOGY_SEED_PARENT_CLASSIFICATION_ID,
    },
    children: [],
    classificationChildren: [],
    recordChildren: [],
    directMemberCount: 0,
    totalMemberCount: 0,
    ...overrides,
  };
}

describe("topology navigation model", () => {
  test("derives graph-map and timeline destinations from seeded classifications", () => {
    const options = listTopologyNavigationOptions();

    expect(options.map((option) => option.classificationId)).toEqual(
      expect.arrayContaining([
        "classification.activation-functions",
        "classification.attention-mechanisms",
        "classification.feed-forward-networks",
        "classification.normalization-layers",
        "classification.position-encoding-methods",
        "classification.tokenization-methods",
        "classification.transformer-block-structures",
      ]),
    );
    expect(options.map((option) => option.classificationSlug)).toEqual(
      expect.arrayContaining([
        "activation-functions",
        "attention-mechanisms",
        "feed-forward-networks",
        "normalization-layers",
        "position-encoding-methods",
        "tokenization-methods",
        "transformer-block-structures",
      ]),
    );
    expect(options.map((option) => option.label)).toEqual(
      expect.arrayContaining([
        "Activation Functions",
        "Attention Mechanisms",
        "Feed Forward Networks",
      ]),
    );

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

  test("preserves locale-aware browse routes and localized labels when provided", async () => {
    const messages = await loadUiMessages("vi");
    const options = listTopologyNavigationOptions({
      locale: "vi",
      labels: getTopologyNavigationLabels(messages),
    });

    const activation = options.find(
      (option) => option.classificationSlug === "activation-functions",
    );
    const feedForward = options.find(
      (option) => option.classificationSlug === "feed-forward-networks",
    );

    expect(activation?.label).toBe("Hàm kích hoạt");
    expect(activation?.destinations).toContainEqual({
      mode: "graph-map",
      label: "Bản đồ đồ thị",
      href: "/vi/browse?classification=activation-functions&mode=graph-map",
    });
    expect(feedForward?.destinations).toContainEqual({
      mode: "timeline",
      label: "Dòng thời gian",
      href: "/vi/browse?classification=feed-forward-networks&mode=timeline",
    });
  });

  test("returns an empty model when no eligible seed classifications exist", () => {
    expect(listTopologyNavigationOptions({ tree: [] })).toEqual([]);

    expect(
      listTopologyNavigationOptions({
        tree: [
          publishedClassificationNode({
            classification: {
              ...publishedClassificationNode({}).classification,
              id: TOPOLOGY_SEED_PARENT_CLASSIFICATION_ID,
              slug: "neural-network-components",
            },
            classificationChildren: [
              publishedClassificationNode({
                classification: {
                  ...publishedClassificationNode({}).classification,
                  id: "classification.no-members",
                  slug: "no-members",
                },
              }),
            ],
          }),
        ],
      }),
    ).toEqual([]);
  });

  test("derives option counts from generated child trees", () => {
    const nestedChild = publishedClassificationNode({
      classification: {
        ...publishedClassificationNode({}).classification,
        id: "classification.gated-ffn",
        slug: "gated-ffn",
      },
      totalMemberCount: 2,
    });
    const optionTree = publishedClassificationNode({
      classification: {
        ...publishedClassificationNode({}).classification,
        id: "classification.feed-forward-networks",
        slug: "feed-forward-networks",
      },
      classificationChildren: [nestedChild],
      children: [nestedChild],
      totalMemberCount: 2,
    });

    const options = listTopologyNavigationOptions({
      tree: [
        publishedClassificationNode({
          classification: {
            ...publishedClassificationNode({}).classification,
            id: TOPOLOGY_SEED_PARENT_CLASSIFICATION_ID,
            slug: "neural-network-components",
          },
          classificationChildren: [optionTree],
          children: [optionTree],
          totalMemberCount: 2,
        }),
      ],
    });

    expect(options).toHaveLength(1);
    expect(options[0]).toMatchObject({
      classificationId: "classification.feed-forward-networks",
      classificationSlug: "feed-forward-networks",
      memberCount: 2,
    });
  });
});
