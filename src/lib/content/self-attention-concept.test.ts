import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

describe("Self-attention concept page (transformer-self-attention-page-001)", () => {
  test("registry record is published with broad aliases and curated related ids", () => {
    const record = getConceptById("concept.self-attention");
    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.aliases).toEqual([
      "self-attention",
      "self attention",
      "self attention mechanism",
    ]);
    expect(record?.tags).toEqual(["attention", "foundations"]);
    expect(record?.relatedIds).toEqual([
      "concept.transformer-architecture",
      "module.attention",
      "concept.token",
      "module.multi-head-attention",
      "module.grouped-query-attention",
    ]);
    expect(record?.explainsIds).toEqual([
      "module.multi-head-attention",
      "module.grouped-query-attention",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.self-attention")).toBe(
      true,
    );
  });

  test("curated related links point to transformer architecture, attention, token, MHA, and GQA", () => {
    const source = getConceptById("concept.self-attention");
    if (!source) {
      throw new Error("expected concept.self-attention in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find(
        (item) => item.registryId === "concept.transformer-architecture",
      )?.href,
    ).toBe("/docs/concepts/transformer-architecture");
    expect(
      items.find((item) => item.registryId === "module.attention")?.href,
    ).toBe("/docs/modules/attention");
    expect(
      items.find((item) => item.registryId === "concept.token")?.href,
    ).toBe("/docs/glossary/token");
    expect(
      items.find((item) => item.registryId === "module.multi-head-attention")
        ?.href,
    ).toBe("/docs/modules/multi-head-attention");
    expect(
      items.find((item) => item.registryId === "module.grouped-query-attention")
        ?.href,
    ).toBe("/docs/modules/grouped-query-attention");
  });

  test("page renders canonical concept route content and broad related links", async () => {
    const page = await loadConceptPage("self-attention");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.self-attention");
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "same sequence",
    );

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("What It Is");
    expect(html).toContain("Why It Matters");
    expect(html).toContain("Inside A Transformer Block");
    expect(html).toContain("Limitations And Tradeoffs");
    expect(html).toContain("Where To Read Next");
    expect(html).toContain(
      "hands the updated representation to the rest of the block",
    );
    expect(html).toContain("memory-saving variant");
    expect(html).toContain(
      "the score matrix and the saved key-value state grow quickly",
    );
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/docs/glossary/token"');
    expect(html).toContain('href="/docs/modules/multi-head-attention"');
    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('href="/tags/attention"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });
});
