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

describe("Phase 3 transformer architecture concept page (US-001)", () => {
  test("registry record is published with prerequisites and curated related ids", () => {
    const record = getConceptById("concept.transformer-architecture");
    expect(record?.status).toBe("published");
    expect(record?.conceptType).toBe("architecture");
    expect(record?.prerequisiteIds).toEqual([
      "concept.architecture",
      "concept.module",
    ]);
    expect(record?.relatedIds).toEqual([
      "module.attention",
      "concept.feed-forward-network",
      "concept.normalization",
      "concept.residual-connection",
      "concept.positional-encodings",
    ]);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.transformer-architecture"),
    ).toBe(true);
  });

  test("curated related lists attention, feed-forward, normalization, residual, and positional encodings as navigable", () => {
    const source = getConceptById("concept.transformer-architecture");
    if (!source) {
      throw new Error("expected concept.transformer-architecture in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const attention = items.find(
      (item) => item.registryId === "module.attention",
    );
    expect(attention?.href).toBe("/docs/modules/attention");
    expect(attention?.isPlanned).toBe(false);

    const feedForward = items.find(
      (item) => item.registryId === "concept.feed-forward-network",
    );
    expect(feedForward?.href).toBe("/docs/glossary/feed-forward-network");
    expect(feedForward?.isPlanned).toBe(false);

    const residual = items.find(
      (item) => item.registryId === "concept.residual-connection",
    );
    expect(residual?.href).toBe("/docs/glossary/residual-connection");
    expect(residual?.isPlanned).toBe(false);

    const positionalEncodings = items.find(
      (item) => item.registryId === "concept.positional-encodings",
    );
    expect(positionalEncodings?.href).toBe(
      "/docs/concepts/positional-encodings",
    );
    expect(positionalEncodings?.isPlanned).toBe(false);

    const normalization = items.find(
      (item) => item.registryId === "concept.normalization",
    );
    expect(normalization?.href).toBe("/docs/glossary/normalization");
    expect(normalization?.isPlanned).toBe(false);
  });

  test("page renders title, sections, and attention related link without a where-it-appears section", async () => {
    const page = await loadConceptPage("transformer-architecture");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe(
      "concept.transformer-architecture",
    );
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);
    expect(page.messages.openingSummary?.toLowerCase()).toContain("block");

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
    expect(html).toContain(
      "Most modern language models share this block pattern",
    );
    expect(html).not.toContain('id="where-it-appears"');
    expect(html).not.toContain('data-testid="folded-summary"');
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/docs/glossary/feed-forward-network"');
    expect(html).toContain('href="/docs/glossary/normalization"');
    expect(html).toContain('href="/docs/glossary/residual-connection"');
    expect(html).toContain('href="/docs/concepts/positional-encodings"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });
});
