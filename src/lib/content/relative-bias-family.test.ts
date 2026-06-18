import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadModulePage } from "@/lib/content/module-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

describe("Phase 3 relative bias family pages (US-003)", () => {
  test("relative position bias distinguishes the general family from the T5-specific subtype", () => {
    const relativeBias = getConceptById("concept.relative-position-bias");
    const t5Bias = getConceptById("concept.t5-relative-position-bias");

    expect(relativeBias?.relatedIds).toEqual([
      "concept.positional-encodings",
      "concept.absolute-positional-embeddings",
      "concept.t5-relative-position-bias",
      "concept.rope",
      "concept.alibi",
    ]);
    expect(relativeBias?.explainsIds).toEqual([
      "concept.t5-relative-position-bias",
    ]);
    expect(t5Bias?.relatedIds).toEqual([
      "concept.positional-encodings",
      "concept.relative-position-bias",
      "concept.encoder-decoder",
      "concept.rope",
      "concept.alibi",
    ]);
    expect(t5Bias?.prerequisiteIds).toEqual([
      "concept.positional-encodings",
      "concept.relative-position-bias",
    ]);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.t5-relative-position-bias"),
    ).toBe(true);
  });

  test("family related-doc links resolve between relative bias, T5 bias, RoPE, and ALiBi", () => {
    const relativeBias = getConceptById("concept.relative-position-bias");
    const t5Bias = getConceptById("concept.t5-relative-position-bias");

    if (!relativeBias || !t5Bias) {
      throw new Error("expected relative bias family records in registry");
    }

    const records = listRelatedRegistryRecords();
    const relativeItems = deriveCuratedRelatedItems(
      relativeBias,
      records,
      PUBLISHED_DOCS_REGISTRY_IDS,
    );
    const t5Items = deriveCuratedRelatedItems(
      t5Bias,
      records,
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      relativeItems.find(
        (item) => item.registryId === "concept.t5-relative-position-bias",
      )?.href,
    ).toBe("/docs/modules/t5-relative-position-bias");
    expect(
      relativeItems.find((item) => item.registryId === "concept.rope")?.href,
    ).toBe("/docs/modules/rope");
    expect(
      relativeItems.find((item) => item.registryId === "concept.alibi")?.href,
    ).toBe("/docs/modules/alibi");
    expect(
      t5Items.find(
        (item) => item.registryId === "concept.relative-position-bias",
      )?.href,
    ).toBe("/docs/modules/relative-position-bias");
    expect(
      t5Items.find((item) => item.registryId === "concept.rope")?.href,
    ).toBe("/docs/modules/rope");
    expect(
      t5Items.find((item) => item.registryId === "concept.alibi")?.href,
    ).toBe("/docs/modules/alibi");
  });

  test("published pages render with visible family navigation and references", async () => {
    for (const slug of [
      "relative-position-bias",
      "t5-relative-position-bias",
    ] as const) {
      const page = await loadModulePage(slug);
      const html = renderToStaticMarkup(
        createElement(ModulePageProviders, {
          messages: page.messages,
          assets: page.assets,
          // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
          children: page.content,
        }),
      );

      expect(page.frontmatter.status).toBe("published");
      expect(page.messages.openingSummary?.length).toBeGreaterThan(0);
      expect(html).toContain("Related Concepts And Modules");
      expect(html).toContain("References");
      expect(html).toContain('href="/docs/concepts/positional-encodings"');
      expect(html).toContain('href="/docs/modules/rope"');
      expect(html).toContain('href="/docs/modules/alibi"');
      expect(html).toContain('href="/tags/foundations"');
    }

    const relativeBiasPage = await loadModulePage("relative-position-bias");
    const relativeBiasHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: relativeBiasPage.messages,
        assets: relativeBiasPage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: relativeBiasPage.content,
      }),
    );
    expect(relativeBiasHtml).toContain(
      'href="/docs/modules/t5-relative-position-bias"',
    );

    const t5Page = await loadModulePage("t5-relative-position-bias");
    const t5Html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: t5Page.messages,
        assets: t5Page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: t5Page.content,
      }),
    );
    expect(t5Html).toContain('href="/docs/modules/relative-position-bias"');
    expect(t5Html).toContain("Raffel");
  });
});
