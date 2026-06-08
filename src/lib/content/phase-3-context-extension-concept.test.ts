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

describe("Phase 3 context extension concept page (US-012)", () => {
  test("registry record is published with prerequisite ids and curated related ids", () => {
    const record = getConceptById("concept.context-extension");
    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.prerequisiteIds).toEqual([
      "concept.context-window",
      "concept.rope",
    ]);
    expect(record?.relatedIds).toEqual([
      "concept.context-window",
      "concept.rope",
      "concept.why-long-context-is-hard",
      "module.grouped-query-attention",
      "module.attention",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.context-extension")).toBe(
      true,
    );
  });

  test("curated related links context window, RoPE, attention modules, and planned hardness page", () => {
    const source = getConceptById("concept.context-extension");
    if (!source) {
      throw new Error("expected concept.context-extension in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const contextWindow = items.find(
      (item) => item.registryId === "concept.context-window",
    );
    expect(contextWindow?.href).toBe("/docs/glossary/context-window");
    expect(contextWindow?.isPlanned).toBe(false);

    const rope = items.find((item) => item.registryId === "concept.rope");
    expect(rope?.href).toBe("/docs/glossary/rope");
    expect(rope?.isPlanned).toBe(false);

    const whyHard = items.find(
      (item) => item.registryId === "concept.why-long-context-is-hard",
    );
    expect(whyHard?.isPlanned).toBe(true);
    expect(whyHard?.href).toBeUndefined();
    expect(whyHard?.reasonLabel).toBe(PLANNED_RELATED_REASON_LABEL);

    const gqa = items.find(
      (item) => item.registryId === "module.grouped-query-attention",
    );
    expect(gqa?.href).toBe("/docs/modules/grouped-query-attention");
    expect(gqa?.isPlanned).toBe(false);

    const attention = items.find(
      (item) => item.registryId === "module.attention",
    );
    expect(attention?.href).toBe("/docs/modules/attention");
    expect(attention?.isPlanned).toBe(false);
  });

  test("page renders title, sections, opening summary, and forward links to context window and RoPE", async () => {
    const page = await loadConceptPage("context-extension");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.context-extension");
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "finite sequence",
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
    expect(html).toContain("position scaling");
    expect(html).toContain('href="/docs/glossary/context-window"');
    expect(html).toContain('href="/docs/glossary/rope"');
    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain("why long context is hard");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
  });
});
