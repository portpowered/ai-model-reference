import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

describe("Phase 3 RoPE scaling family pages (phase-3-pages-005)", () => {
  test("registry records publish the SuperHOT, NTK-aware, and YaRN family", () => {
    const superhot = getConceptById("concept.superhot-rope");
    const ntkAware = getConceptById("concept.ntk-aware-rope-scaling");
    const yarn = getConceptById("concept.yarn");

    expect(superhot?.relatedIds).toEqual([
      "concept.rope",
      "concept.context-extension",
      "concept.ntk-aware-rope-scaling",
      "concept.yarn",
    ]);
    expect(ntkAware?.relatedIds).toEqual([
      "concept.rope",
      "concept.context-extension",
      "concept.superhot-rope",
      "concept.yarn",
    ]);
    expect(yarn?.relatedIds).toEqual([
      "concept.rope",
      "concept.context-extension",
      "concept.ntk-aware-rope-scaling",
      "concept.superhot-rope",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.superhot-rope")).toBe(true);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.ntk-aware-rope-scaling"),
    ).toBe(true);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.yarn")).toBe(true);
  });

  test("visible related-doc links connect each page to RoPE, context extension, and a sibling scaling page", () => {
    const records = listRelatedRegistryRecords();

    for (const [sourceId, siblingId] of [
      ["concept.superhot-rope", "concept.ntk-aware-rope-scaling"],
      ["concept.ntk-aware-rope-scaling", "concept.yarn"],
      ["concept.yarn", "concept.superhot-rope"],
    ] as const) {
      const source = getConceptById(sourceId);
      if (!source) {
        throw new Error(`expected ${sourceId} in registry`);
      }

      const items = deriveCuratedRelatedItems(
        source,
        records,
        PUBLISHED_DOCS_REGISTRY_IDS,
      );

      expect(
        items.find((item) => item.registryId === "concept.rope")?.href,
      ).toBe("/docs/modules/rope");
      expect(
        items.find((item) => item.registryId === "concept.context-extension")
          ?.href,
      ).toBe("/docs/concepts/context-extension");
      expect(items.find((item) => item.registryId === siblingId)?.href).toMatch(
        /^\/docs\/glossary\//,
      );
    }
  });

  test("new pages render glossary content, family links, and references", async () => {
    for (const slug of [
      "superhot-rope",
      "ntk-aware-rope-scaling",
      "yarn",
    ] as const) {
      const page = await loadGlossaryPage(slug);
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
      expect(html).toContain('href="/docs/modules/rope"');
      expect(html).toContain('href="/docs/concepts/context-extension"');
      expect(html).toContain('href="/tags/foundations"');
      expect(html).toContain('data-testid="citation-list"');
      expect(html).toContain("References");
      expect(html).not.toContain("Reader Shortcut");
      expect(html).not.toContain("Phase");
    }

    const ntkAwarePage = await loadGlossaryPage("ntk-aware-rope-scaling");
    const ntkAwareHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: ntkAwarePage.messages,
        assets: ntkAwarePage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: ntkAwarePage.content,
      }),
    );

    expect(ntkAwareHtml).toContain('href="/docs/modules/yarn"');
    expect(ntkAwareHtml).toContain('href="/docs/modules/superhot-rope"');
  });
});
