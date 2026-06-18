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

describe("Phase 3 long-context extension pages (phase-3-pages-006)", () => {
  test("registry records publish LongRoPE and positional interpolation with required family links", () => {
    const longrope = getConceptById("concept.longrope");
    const positionalInterpolation = getConceptById(
      "concept.positional-interpolation",
    );

    expect(longrope?.relatedIds).toEqual([
      "concept.rope",
      "concept.context-extension",
      "concept.why-long-context-is-hard",
      "concept.ntk-aware-rope-scaling",
      "concept.yarn",
    ]);
    expect(positionalInterpolation?.relatedIds).toEqual([
      "concept.rope",
      "concept.context-extension",
      "concept.why-long-context-is-hard",
      "concept.longrope",
      "concept.ntk-aware-rope-scaling",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.longrope")).toBe(true);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.positional-interpolation"),
    ).toBe(true);
  });

  test("visible related-doc links connect both pages to RoPE, context extension, and why long context is hard", () => {
    const records = listRelatedRegistryRecords();

    for (const [sourceId, siblingId] of [
      ["concept.longrope", "concept.ntk-aware-rope-scaling"],
      ["concept.positional-interpolation", "concept.longrope"],
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
      ).toBe("/docs/glossary/rope");
      expect(
        items.find((item) => item.registryId === "concept.context-extension")
          ?.href,
      ).toBe("/docs/concepts/context-extension");
      expect(
        items.find(
          (item) => item.registryId === "concept.why-long-context-is-hard",
        )?.href,
      ).toBe("/docs/concepts/why-long-context-is-hard");
      expect(items.find((item) => item.registryId === siblingId)?.href).toMatch(
        /^\/docs\/glossary\//,
      );
    }
  });

  test("new pages render glossary content, long-context links, and references", async () => {
    for (const slug of ["longrope", "positional-interpolation"] as const) {
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
      expect(html).toContain('href="/docs/glossary/rope"');
      expect(html).toContain('href="/docs/concepts/context-extension"');
      expect(html).toContain('href="/docs/concepts/why-long-context-is-hard"');
      expect(html).toContain('href="/tags/foundations"');
      expect(html).toContain('data-testid="citation-list"');
      expect(html).toContain("References");
      expect(html).not.toContain("Reader Shortcut");
      expect(html).not.toContain("Phase");
    }

    const longropePage = await loadGlossaryPage("longrope");
    const longropeHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: longropePage.messages,
        assets: longropePage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: longropePage.content,
      }),
    );

    expect(longropeHtml).toContain(
      'href="/docs/glossary/ntk-aware-rope-scaling"',
    );
    expect(longropeHtml).toContain('href="/docs/glossary/yarn"');

    const positionalInterpolationPage = await loadGlossaryPage(
      "positional-interpolation",
    );
    const positionalInterpolationHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: positionalInterpolationPage.messages,
        assets: positionalInterpolationPage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: positionalInterpolationPage.content,
      }),
    );

    expect(positionalInterpolationHtml).toContain(
      'href="/docs/glossary/longrope"',
    );
    expect(positionalInterpolationHtml).toContain(
      'href="/docs/glossary/ntk-aware-rope-scaling"',
    );
  });
});
