import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  type LocalDocsPageRef,
  loadLocalDocsPage,
} from "@/lib/content/local-docs-page";
import { loadShippedLocalizedDocsPages } from "@/lib/content/pages";
import { isShippedLocalizedDocsSlug } from "@/lib/content/shipped-localized-docs";

const JAPANESE_ATTENTION_VARIANT_EXPECTATIONS = [
  {
    ref: { section: "modules", slug: "multi-head-attention" },
    registryId: "module.multi-head-attention",
    japaneseDescription:
      "各 query head が専用の key-value head の組を持つ、attention の基準となる設計です。",
    englishFallback:
      "The baseline attention design that gives every query head its own key-value head pair.",
    bodySnippet:
      "各 head は keys と values に対する自分専用の attention 分布を計算し",
    renderedMarker: "何を最適化するか",
    expectedHrefs: [
      "/ja/tags/attention",
      "/ja/docs/modules/attention",
      "/ja/docs/modules/multi-query-attention",
      "/ja/docs/modules/grouped-query-attention",
    ],
    graphLabel: "各 query head が専用の K と V を持つ",
    assetCaption:
      "MHA と MQA を切り替えて、1 つの図上で query head 数と KV head 数を比較する",
    assetAlt: "multi-head attention と multi-query attention の head 数比較",
    tableDimension: "KV head 数",
  },
  {
    ref: { section: "modules", slug: "multi-query-attention" },
    registryId: "module.multi-query-attention",
    japaneseDescription:
      "すべての query head が 1 組の key-value head を共有し、KV cache のメモリを最小化する attention の変種です。",
    englishFallback:
      "An attention variant that shares one key-value head across all query heads to minimize KV-cache memory.",
    bodySnippet:
      "各 query head は自分の attention score を計算し続けますが、すべての head が同じ key head と value head を読みます。",
    renderedMarker: "式または計算スキーマ",
    expectedHrefs: [
      "/ja/tags/attention",
      "/ja/docs/modules/attention",
      "/ja/docs/modules/multi-head-attention",
      "/ja/docs/modules/grouped-query-attention",
    ],
    graphLabel: "1 組の共有 key/value がすべての query head を支える",
    assetCaption:
      "MHA と MQA を切り替えて、1 つの図上で query head 数と KV head 数を比較する",
    assetAlt: "multi-head attention と multi-query attention の head 数比較",
    tableDimension: "KV head 数",
  },
  {
    ref: { section: "modules", slug: "linear-attention" },
    registryId: "module.linear-attention",
    japaneseDescription:
      "明示的な softmax の内積 attention を、系列長に対してほぼ線形に伸びる kernel または feature-map の定式化へ置き換える attention の変種です。",
    englishFallback:
      "An attention variant that replaces explicit softmax dot-product attention with kernel or feature-map formulations that scale near-linearly with sequence length.",
    bodySnippet:
      "queries と keys に feature map をかけることで、すべての query-key の組を明示的に採点する代わりに",
    renderedMarker: "系列長に対する伸び方",
    expectedHrefs: [
      "/ja/tags/attention",
      "/ja/docs/modules/grouped-query-attention",
      "/ja/docs/modules/multi-head-attention",
      "/ja/docs/modules/multi-query-attention",
    ],
    graphLabel: "queries と keys に feature map φ を適用",
    assetCaption:
      "MHA と linear attention を切り替えて、完全な softmax 内積 scoring と feature-map による結合的な更新を 1 つの図上で比較する",
    assetAlt:
      "密な multi-head attention と linear attention の feature-map 流れの比較",
    tableDimension: "系列長に対する伸び方",
  },
  {
    ref: { section: "modules", slug: "sliding-window-attention" },
    registryId: "module.sliding-window-attention",
    japaneseDescription:
      "各 query が系列全体ではなく、固定幅の近傍 window にある key 位置だけを読めるように制限する attention の変種です。",
    englishFallback:
      "An attention variant that restricts each query to a fixed local window of key positions instead of the full sequence.",
    bodySnippet:
      "各 query 位置が固定の近傍にある keys だけへ注意を向ける attention の変種です。",
    renderedMarker: "Attention の局所性",
    expectedHrefs: [
      "/ja/tags/attention",
      "/ja/docs/modules/grouped-query-attention",
      "/ja/docs/modules/multi-head-attention",
      "/ja/docs/modules/multi-query-attention",
    ],
    graphLabel: "各 query は sliding window 内の近くの key だけへ届く",
    assetCaption:
      "MHA と sliding-window attention を切り替えて、系列全体への到達範囲と固定幅の局所 window を 1 つの図上で比較する",
    assetAlt:
      "密な multi-head attention と sliding-window attention の局所到達範囲の比較",
    tableDimension: "Attention の局所性",
  },
] satisfies Array<{
  ref: LocalDocsPageRef;
  registryId: string;
  japaneseDescription: string;
  englishFallback: string;
  bodySnippet: string;
  renderedMarker: string;
  expectedHrefs: string[];
  graphLabel: string;
  assetCaption: string;
  assetAlt: string;
  tableDimension: string;
}>;

describe("Phase 4 Japanese representative attention-variant coverage", () => {
  test("Japanese shipped localized docs include the representative attention-variant slugs", async () => {
    const pages = await loadShippedLocalizedDocsPages("ja");
    const docsSlugs = pages.map((page) => page.docsSlug);

    expect(docsSlugs).toContain("modules/multi-head-attention");
    expect(docsSlugs).toContain("modules/multi-query-attention");
    expect(docsSlugs).toContain("modules/linear-attention");
    expect(docsSlugs).toContain("modules/sliding-window-attention");

    for (const docsSlug of docsSlugs) {
      expect(isShippedLocalizedDocsSlug(docsSlug, "ja")).toBe(true);
    }
  });

  for (const expectation of JAPANESE_ATTENTION_VARIANT_EXPECTATIONS) {
    test(`/ja/docs/${expectation.ref.section}/${expectation.ref.slug} ships Japanese reader-facing copy and /ja navigation`, async () => {
      const page = await loadLocalDocsPage(expectation.ref, "ja");
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
      expect(page.messages.description).toBe(expectation.japaneseDescription);
      expect(page.messages.description).not.toContain(
        expectation.englishFallback,
      );
      expect(JSON.stringify(page.messages)).toContain(expectation.bodySnippet);
      expect(html).toContain(expectation.renderedMarker);
      expect(html).not.toContain(expectation.englishFallback);

      expect(
        Object.values(page.messages.graph?.nodes ?? {}).some(
          (node) => node.label === expectation.graphLabel,
        ),
      ).toBe(true);

      expect(
        page.messages.assets?.conceptMap?.caption ??
          page.messages.assets?.computeFlow?.caption,
      ).toBe(expectation.assetCaption);
      expect(html).toContain(expectation.assetCaption);

      expect(
        page.messages.assets?.conceptMap?.alt ??
          page.messages.assets?.computeFlow?.alt,
      ).toBe(expectation.assetAlt);
      expect(html).toContain(expectation.assetAlt);

      if (expectation.ref.slug === "linear-attention") {
        expect(
          page.messages.tables?.comparison?.dimensions?.sequenceScaling,
        ).toBe(expectation.tableDimension);
      } else if (expectation.ref.slug === "sliding-window-attention") {
        expect(
          page.messages.tables?.comparison?.dimensions?.attentionLocality,
        ).toBe(expectation.tableDimension);
      } else {
        expect(page.messages.tables?.comparison?.dimensions?.kvHeadCount).toBe(
          expectation.tableDimension,
        );
      }
      expect(html).toContain(expectation.tableDimension);

      for (const href of expectation.expectedHrefs) {
        expect(html).toContain(`href="${href}"`);
      }
    });
  }
});
