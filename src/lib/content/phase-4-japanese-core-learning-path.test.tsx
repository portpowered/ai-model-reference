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

const JAPANESE_CORE_PAGE_EXPECTATIONS = [
  {
    ref: { section: "glossary", slug: "token" },
    registryId: "concept.token",
    japaneseDescription:
      "言語モデルが読み取り、予測する最小単位のテキストです。多くの場合は単語そのものではなく単語片であり、各トークン ID は attention が動く前にモデルの hidden size に対応する密なベクトルへ embedding されます。",
    englishFallback:
      "The smallest unit of text a language model reads and predicts",
    bodySnippet: "subword tokenizer は珍しい単語を複数の断片に分けることが多く",
    renderedMarker: "これは何か",
    expectedHrefs: ["/ja/tags/attention", "/ja/docs/modules/attention"],
    graphLabel: "トークン ID",
    assetCaption:
      "生のテキストが transformer stack に入る前に token ID へ変わる流れ",
    assetAlt:
      "テキストが tokenizer を通って token ID と embeddings になる流れを示す図",
  },
  {
    ref: { section: "modules", slug: "attention" },
    registryId: "module.attention",
    japaneseDescription:
      "transformer block が query、key、value の射影を使って token 位置どうしの情報を混ぜる仕組みです。",
    englishFallback:
      "How transformer blocks mix information across token positions using query, key, and value projections.",
    bodySnippet:
      "grouped-query attention は query をグループ単位でまとめて KV head を共有しながら",
    renderedMarker: "Attention の変種",
    expectedHrefs: [
      "/ja/tags/attention",
      "/ja/docs/modules/grouped-query-attention",
    ],
  },
  {
    ref: { section: "modules", slug: "grouped-query-attention" },
    registryId: "module.grouped-query-attention",
    japaneseDescription:
      "query のグループごとに key-value head を共有し、KV cache のメモリを減らす attention の変種です。",
    englishFallback:
      "How grouped-query attention reduces KV-cache memory while keeping multi-head expressiveness.",
    bodySnippet: "GQA は KV cache の使用量、自回帰 decoding 中のメモリ帯域",
    renderedMarker: "何を最適化するか",
    expectedHrefs: ["/ja/tags/attention", "/ja/docs/modules/attention"],
    graphLabel: "同じ key/value head を 2 つの query head が共有する",
    assetCaption:
      "MHA と GQA を切り替えて、1 つの図上で query head 数と KV head 数を比較する",
    assetAlt: "multi-head attention と grouped-query attention の head 数比較",
    tableDimension: "KV head 数",
  },
  {
    ref: { section: "concepts", slug: "transformer-architecture" },
    registryId: "concept.transformer-architecture",
    japaneseDescription:
      "attention、feed-forward 層、normalization、residual、位置情報が decoder 型 transformer block の中でどう反復されるかを説明するページです。",
    englishFallback:
      "How attention, feed-forward layers, normalization, residuals, and position information repeat inside each decoder-style transformer block.",
    bodySnippet:
      "attention は文脈混合、feed-forward は各 token の洗練、normalization は学習安定性",
    renderedMarker: "なぜ重要か",
    expectedHrefs: ["/ja/docs/modules/attention", "/ja/tags/foundations"],
  },
] satisfies Array<{
  ref: LocalDocsPageRef;
  registryId: string;
  japaneseDescription: string;
  englishFallback: string;
  bodySnippet: string;
  renderedMarker: string;
  expectedHrefs: string[];
  graphLabel?: string;
  assetCaption?: string;
  assetAlt?: string;
  tableDimension?: string;
}>;

describe("Phase 4 Japanese core learning-path coverage", () => {
  test("Japanese shipped localized docs include the core learning-path slugs", async () => {
    const pages = await loadShippedLocalizedDocsPages("ja");
    const docsSlugs = pages.map((page) => page.docsSlug);

    expect(docsSlugs).toContain("concepts/transformer-architecture");
    expect(docsSlugs).toContain("glossary/token");
    expect(docsSlugs).toContain("modules/attention");
    expect(docsSlugs).toContain("modules/grouped-query-attention");

    for (const docsSlug of docsSlugs) {
      expect(isShippedLocalizedDocsSlug(docsSlug, "ja")).toBe(true);
    }
  });

  for (const expectation of JAPANESE_CORE_PAGE_EXPECTATIONS) {
    test(`/ja/docs/${expectation.ref.section}/${expectation.ref.slug} ships Japanese reader-facing copy without English fallback`, async () => {
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

      if (expectation.graphLabel) {
        expect(
          Object.values(page.messages.graph?.nodes ?? {}).some(
            (node) => node.label === expectation.graphLabel,
          ),
        ).toBe(true);
      }

      if (expectation.assetCaption) {
        expect(
          page.messages.assets?.conceptMap?.caption ??
            page.messages.assets?.computeFlow?.caption,
        ).toBe(expectation.assetCaption);
        expect(html).toContain(expectation.assetCaption);
      }

      if (expectation.assetAlt) {
        expect(
          page.messages.assets?.conceptMap?.alt ??
            page.messages.assets?.computeFlow?.alt,
        ).toBe(expectation.assetAlt);
        expect(html).toContain(expectation.assetAlt);
      }

      if (expectation.tableDimension) {
        expect(page.messages.tables?.comparison?.dimensions?.kvHeadCount).toBe(
          expectation.tableDimension,
        );
        expect(html).toContain(expectation.tableDimension);
      }

      for (const href of expectation.expectedHrefs) {
        expect(html).toContain(`href="${href}"`);
      }
    });
  }
});
