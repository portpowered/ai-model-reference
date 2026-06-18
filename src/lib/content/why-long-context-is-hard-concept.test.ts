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

describe("Phase 3 why long context is hard concept page (US-013)", () => {
  test("registry record is published with prerequisite ids and curated related ids", () => {
    const record = getConceptById("concept.why-long-context-is-hard");
    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.prerequisiteIds).toEqual(["concept.context-window"]);
    expect(record?.relatedIds).toEqual([
      "concept.context-extension",
      "concept.rope",
      "concept.longrope",
      "concept.positional-interpolation",
      "module.attention",
    ]);
    expect(record?.explainsIds).toEqual([
      "concept.longrope",
      "concept.positional-interpolation",
    ]);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.why-long-context-is-hard"),
    ).toBe(true);
  });

  test("curated related links context extension, RoPE, long-context methods, and attention as navigable", () => {
    const source = getConceptById("concept.why-long-context-is-hard");
    if (!source) {
      throw new Error("expected concept.why-long-context-is-hard in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const contextExtension = items.find(
      (item) => item.registryId === "concept.context-extension",
    );
    expect(contextExtension?.href).toBe("/docs/concepts/context-extension");
    expect(contextExtension?.isPlanned).toBe(false);

    const rope = items.find((item) => item.registryId === "concept.rope");
    expect(rope?.href).toBe("/docs/glossary/rope");
    expect(rope?.isPlanned).toBe(false);

    const longrope = items.find(
      (item) => item.registryId === "concept.longrope",
    );
    expect(longrope?.href).toBe("/docs/glossary/longrope");
    expect(longrope?.isPlanned).toBe(false);

    const positionalInterpolation = items.find(
      (item) => item.registryId === "concept.positional-interpolation",
    );
    expect(positionalInterpolation?.href).toBe(
      "/docs/glossary/positional-interpolation",
    );
    expect(positionalInterpolation?.isPlanned).toBe(false);

    const attention = items.find(
      (item) => item.registryId === "module.attention",
    );
    expect(attention?.href).toBe("/docs/modules/attention");
    expect(attention?.isPlanned).toBe(false);
  });

  test("page renders title, sections, opening summary, and related-doc links", async () => {
    const page = await loadConceptPage("why-long-context-is-hard");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe(
      "concept.why-long-context-is-hard",
    );
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "attention work",
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
    expect(html).toContain("quadratic");
    expect(html).toContain("KV-cache");
    expect(html).toContain("extrapolat");
    expect(html).toContain('href="/docs/concepts/context-extension"');
    expect(html).toContain('href="/docs/glossary/rope"');
    expect(html).toContain('href="/docs/glossary/longrope"');
    expect(html).toContain('href="/docs/glossary/positional-interpolation"');
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Phase");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("benchmark");
  });
});
