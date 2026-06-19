import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { loadShippedLocalizedDocsPages } from "@/lib/content/pages";
import { isShippedLocalizedDocsSlug } from "@/lib/content/shipped-localized-docs";

type JapaneseModuleExpectation = {
  slug: string;
  registryId: string;
  japaneseTitle: string;
  englishTitle: string;
  japaneseDescription: string;
  englishFallback: string;
  japaneseBody: string;
  graphCaption: string;
  graphAlt: string;
  tableCaption: string;
  tableDimension: string;
  graphLabel: string;
  expectedHrefs: readonly string[];
  expectedCanonicalFallbackHrefs?: readonly string[];
};

const JAPANESE_MODULE_EXPECTATIONS: readonly JapaneseModuleExpectation[] = [
  {
    slug: "multi-head-attention",
    registryId: "module.multi-head-attention",
    japaneseTitle: "マルチヘッド attention",
    englishTitle: "Multi-head attention",
    japaneseDescription:
      "各 query head がそれぞれ固有の key-value head pair を持つ、基準となる attention 設計。",
    englishFallback:
      "The baseline attention design that gives every query head its own key-value head pair.",
    japaneseBody:
      "MHA は表現の幅を最適化します。異なる query head が同じ系列の中で別々の関係に注目でき、key-value のパラメータを共有する必要がありません。",
    graphCaption:
      "Multi-head attention と multi-query attention を切り替えて、query head 数と key-value head 数を 1 つの図で比較します。",
    graphAlt: "Multi-head attention と multi-query attention の head 数比較",
    tableCaption: "Multi-head attention と近い attention 変種の比較",
    tableDimension: "Key-value head 数",
    graphLabel: "各 query head は固有の K と V を持つ",
    expectedHrefs: [
      "/ja/tags/attention",
      "/ja/docs/modules/attention",
      "/ja/docs/modules/grouped-query-attention",
      "/ja/docs/modules/multi-query-attention",
    ],
  },
  {
    slug: "multi-query-attention",
    registryId: "module.multi-query-attention",
    japaneseTitle: "マルチクエリ attention",
    englishTitle: "Multi-query attention",
    japaneseDescription:
      "すべての query head で 1 つの key-value head を共有し、KV-cache メモリを最小化する attention 変種。",
    englishFallback:
      "An attention variant that shares one key-value head across all query heads to minimize key-value cache memory.",
    japaneseBody:
      "MQA は自回帰 decoding 中の KV-cache サイズとメモリ帯域を対象に最適化します。",
    graphCaption:
      "Multi-head attention と multi-query attention を切り替えて、query head 数と key-value head 数を 1 つの図で比較します。",
    graphAlt: "Multi-head attention と multi-query attention の head 数比較",
    tableCaption: "Multi-query attention と近い attention 変種の比較",
    tableDimension: "Key-value head 数",
    graphLabel: "1 組の共有 key/value がすべての query head を支える",
    expectedHrefs: [
      "/ja/tags/attention",
      "/ja/tags/kv-cache",
      "/ja/docs/modules/attention",
      "/ja/docs/modules/grouped-query-attention",
      "/ja/docs/modules/multi-head-attention",
    ],
    expectedCanonicalFallbackHrefs: [
      "/docs/glossary/kv-cache",
      "/docs/glossary/decode",
      "/docs/glossary/prefill-decode-split",
      "/docs/concepts/quantization",
    ],
  },
  {
    slug: "sliding-window-attention",
    registryId: "module.sliding-window-attention",
    japaneseTitle: "スライディングウィンドウ attention",
    englishTitle: "Sliding-window attention",
    japaneseDescription:
      "各 query を系列全体ではなく固定の局所 window に制限する attention 変種。",
    englishFallback:
      "An attention variant that restricts each query to a fixed local window of key positions instead of the full sequence.",
    japaneseBody:
      "Sliding-window attention は、attention 計算コスト、score 行列の生成に必要なメモリ帯域、そして全 pair の dense attention が支配的になる長系列 serving のコストを対象に最適化します。",
    graphCaption:
      "Multi-head attention と sliding-window attention を切り替えて、全系列への到達範囲と固定の局所 window を 1 つの図で比較します。",
    graphAlt:
      "Dense multi-head attention と sliding-window attention の局所到達範囲比較",
    tableCaption: "Sliding-window attention と近い attention 変種の比較",
    tableDimension: "Attention の局所性",
    graphLabel: "各 query は sliding window 内の近くの key にしか届かない",
    expectedHrefs: [
      "/ja/tags/attention",
      "/ja/tags/context-window",
      "/ja/docs/modules/multi-head-attention",
      "/ja/docs/modules/multi-query-attention",
      "/ja/docs/modules/grouped-query-attention",
    ],
    expectedCanonicalFallbackHrefs: [
      "/docs/glossary/kv-cache",
      "/docs/glossary/decode",
      "/docs/glossary/prefill-decode-split",
    ],
  },
  {
    slug: "linear-attention",
    registryId: "module.linear-attention",
    japaneseTitle: "線形 attention",
    englishTitle: "Linear attention",
    japaneseDescription:
      "明示的な softmax dot-product attention を、系列長に対してほぼ線形に伸びる kernel または feature-map 形式へ置き換える attention 変種。",
    englishFallback:
      "An attention variant that replaces explicit softmax dot-product attention with kernel or feature-map formulations that scale near-linearly with sequence length.",
    japaneseBody:
      "Linear attention は、密な二乗 attention が長文脈で実行時間を支配してしまうときの、系列長スケーリング、attention 計算コスト、メモリ帯域を対象に最適化します。",
    graphCaption:
      "Multi-head attention と linear attention を切り替えて、完全な softmax dot-product scoring と feature-map による結合的更新を 1 つの図で比較します。",
    graphAlt:
      "Dense multi-head attention と feature-map 型 linear attention の計算フロー比較",
    tableCaption: "Linear attention と近い attention 変種の比較",
    tableDimension: "系列長に対するスケーリング",
    graphLabel: "Query はすべての key を採点する代わりに、蓄積済みの要約を読む",
    expectedHrefs: [
      "/ja/tags/attention",
      "/ja/docs/modules/multi-head-attention",
      "/ja/docs/modules/multi-query-attention",
      "/ja/docs/modules/grouped-query-attention",
    ],
  },
] as const;

describe("Phase 4 Japanese attention variant proof set", () => {
  test("Japanese shipped localized docs include the four representative attention-variant modules", async () => {
    const pages = await loadShippedLocalizedDocsPages("ja");
    const docsSlugs = pages.map((page) => page.docsSlug);

    expect(docsSlugs).toContain("modules/multi-head-attention");
    expect(docsSlugs).toContain("modules/multi-query-attention");
    expect(docsSlugs).toContain("modules/sliding-window-attention");
    expect(docsSlugs).toContain("modules/linear-attention");
    expect(
      isShippedLocalizedDocsSlug("modules/multi-head-attention", "ja"),
    ).toBe(true);
    expect(
      isShippedLocalizedDocsSlug("modules/multi-query-attention", "ja"),
    ).toBe(true);
    expect(
      isShippedLocalizedDocsSlug("modules/sliding-window-attention", "ja"),
    ).toBe(true);
    expect(isShippedLocalizedDocsSlug("modules/linear-attention", "ja")).toBe(
      true,
    );
  });

  for (const expectation of JAPANESE_MODULE_EXPECTATIONS) {
    test(`/ja/docs/modules/${expectation.slug} ships Japanese copy, graph text, and locale-aware module chrome`, async () => {
      const page = await loadLocalDocsPage(
        {
          section: "modules",
          slug: expectation.slug,
        },
        "ja",
      );
      const html = renderToStaticMarkup(
        createElement(
          ModulePageProviders,
          {
            messages: page.messages,
            assets: page.assets,
            locale: "ja",
          },
          page.content,
        ),
      );

      expect(page.frontmatter.registryId).toBe(expectation.registryId);
      expect(page.messages.title).toBe(expectation.japaneseTitle);
      expect(page.messages.title).not.toBe(expectation.englishTitle);
      expect(page.messages.description).toBe(expectation.japaneseDescription);
      expect(page.messages.description).not.toBe(expectation.englishFallback);
      expect(page.messages.sections?.whatItOptimizes.body).toContain(
        expectation.japaneseBody,
      );
      expect(page.messages.assets?.computeFlow?.caption).toBe(
        expectation.graphCaption,
      );
      expect(page.messages.assets?.computeFlow?.alt).toBe(expectation.graphAlt);
      expect(page.messages.assets?.comparisonTable?.caption).toBe(
        expectation.tableCaption,
      );
      expect(
        Object.values(page.messages.tables?.comparison?.dimensions ?? {}).some(
          (dimension) => dimension === expectation.tableDimension,
        ),
      ).toBe(true);
      expect(
        Object.values(page.messages.graph?.nodes ?? {}).some(
          (node) => node.label === expectation.graphLabel,
        ),
      ).toBe(true);
      expect(html).not.toContain(expectation.englishFallback);
      expect(html).toContain(expectation.graphCaption);
      expect(html).toContain(expectation.graphAlt);
      expect(html).toContain(expectation.tableCaption);
      expect(html).toContain(expectation.tableDimension);

      for (const href of expectation.expectedHrefs) {
        expect(html).toContain(`href="${href}"`);
      }

      for (const href of expectation.expectedCanonicalFallbackHrefs ?? []) {
        expect(html).toContain(`href="${href}"`);
        expect(html).not.toContain(`href="/ja${href}"`);
      }

      expect(html).not.toContain(`href="/docs/modules/${expectation.slug}"`);
    });
  }
});
