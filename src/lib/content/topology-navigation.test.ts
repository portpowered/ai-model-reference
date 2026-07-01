import { describe, expect, test } from "bun:test";
import type { ClassificationSubtreeClassificationNode } from "@/lib/content/registry-runtime";
import {
  getTopologyNavigationLabels,
  listTopologyNavigationOptions,
} from "@/lib/content/topology-navigation";
import { loadUiMessages } from "@/lib/content/ui-messages";

function publishedClassificationNode(
  overrides: Partial<ClassificationSubtreeClassificationNode>,
): ClassificationSubtreeClassificationNode {
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
      parentClassificationId: "classification.module-root",
    },
    children: [],
    classificationChildren: [],
    recordChildren: [],
    directMemberCount: 0,
    descendantMemberCount: 0,
    hasMatchingMembers: false,
    totalMemberCount: 0,
    ...overrides,
  };
}

describe("topology navigation model", () => {
  test("derives graph-map and timeline destinations from runtime-discovered classifications", () => {
    const options = listTopologyNavigationOptions();

    expect(options.map((option) => option.classificationId)).toEqual(
      expect.arrayContaining([
        "classification.module.activation",
        "classification.module.attention",
        "classification.module.feed-forward",
        "classification.module.normalization",
        "classification.module.positional-encoding",
        "classification.module.tokenization",
        "classification.module.transformer-block",
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
        option.classificationId === "classification.module.activation",
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
        option.classificationId === "classification.module.feed-forward",
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
    expect(options.map((option) => option.label)).toEqual(
      expect.arrayContaining([
        "Hàm kích hoạt",
        "Cơ chế attention",
        "Mạng feed-forward",
        "Lớp chuẩn hóa",
        "Positional Embeddings",
        "Tokenizers",
        "Cấu trúc khối transformer",
      ]),
    );
  });

  test("preserves localized classification labels across every runtime-discovered branch for japanese routes", async () => {
    const messages = await loadUiMessages("ja");
    const options = listTopologyNavigationOptions({
      locale: "ja",
      labels: getTopologyNavigationLabels(messages),
    });

    expect(options.map((option) => option.label)).toEqual(
      expect.arrayContaining([
        "活性化関数",
        "Attention 機構",
        "フィードフォワードネットワーク",
        "正規化層",
        "Positional Embeddings",
        "Tokenizers",
        "Transformer ブロック構造",
      ]),
    );
    expect(
      options.find(
        (option) => option.classificationSlug === "attention-mechanisms",
      )?.destinations,
    ).toContainEqual({
      mode: "graph-map",
      label: "グラフマップ",
      href: "/ja/browse?classification=attention-mechanisms&mode=graph-map",
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
              id: "classification.module-root",
              slug: "module-root",
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
            id: "classification.module-root",
            slug: "module-root",
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
