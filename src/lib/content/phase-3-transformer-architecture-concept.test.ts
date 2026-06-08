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
import {
  deriveCuratedRelatedItems,
  PLANNED_RELATED_REASON_LABEL,
} from "@/lib/content/related-docs";

const PLANNED_SIBLING_COMPONENT_IDS = [
  "concept.residual-connection",
  "concept.positional-encodings",
] as const;

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
      ...PLANNED_SIBLING_COMPONENT_IDS,
    ]);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.transformer-architecture"),
    ).toBe(true);
  });

  test("curated related lists attention and feed-forward as navigable and remaining siblings as planned", () => {
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

    const plannedSiblings = items.filter((item) =>
      PLANNED_SIBLING_COMPONENT_IDS.includes(
        item.registryId as (typeof PLANNED_SIBLING_COMPONENT_IDS)[number],
      ),
    );
    expect(plannedSiblings).toHaveLength(2);
    for (const item of plannedSiblings) {
      expect(item.isPlanned).toBe(true);
      expect(item.href).toBeUndefined();
      expect(item.reasonLabel).toBe(PLANNED_RELATED_REASON_LABEL);
    }

    const normalization = items.find(
      (item) => item.registryId === "concept.normalization",
    );
    expect(normalization?.href).toBe("/docs/glossary/normalization");
    expect(normalization?.isPlanned).toBe(false);
  });

  test("page renders title, sections, opening summary, and attention related link", async () => {
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
    expect(html).toContain("repeating loop");
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/docs/glossary/feed-forward-network"');
    expect(html).toContain('href="/docs/glossary/normalization"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain(PLANNED_RELATED_REASON_LABEL);
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });
});
