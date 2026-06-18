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

describe("Phase 3 absolute positional embedding family pages (US-002)", () => {
  test("absolute registry record points to the learned and sinusoidal variants", () => {
    const absolute = getConceptById("concept.absolute-positional-embeddings");
    expect(absolute?.relatedIds).toEqual([
      "concept.positional-encodings",
      "concept.learned-positional-embeddings",
      "concept.sinusoidal-positional-embeddings",
      "concept.relative-position-bias",
      "concept.rope",
      "concept.alibi",
    ]);
    expect(absolute?.explainsIds).toEqual([
      "concept.learned-positional-embeddings",
      "concept.sinusoidal-positional-embeddings",
    ]);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.learned-positional-embeddings"),
    ).toBe(true);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has(
        "concept.sinusoidal-positional-embeddings",
      ),
    ).toBe(true);
  });

  test("family related-doc links resolve between generic, learned, and sinusoidal pages", () => {
    const absolute = getConceptById("concept.absolute-positional-embeddings");
    const learned = getConceptById("concept.learned-positional-embeddings");
    const sinusoidal = getConceptById(
      "concept.sinusoidal-positional-embeddings",
    );

    if (!absolute || !learned || !sinusoidal) {
      throw new Error(
        "expected absolute positional family records in registry",
      );
    }

    const records = listRelatedRegistryRecords();
    const absoluteItems = deriveCuratedRelatedItems(
      absolute,
      records,
      PUBLISHED_DOCS_REGISTRY_IDS,
    );
    const learnedItems = deriveCuratedRelatedItems(
      learned,
      records,
      PUBLISHED_DOCS_REGISTRY_IDS,
    );
    const sinusoidalItems = deriveCuratedRelatedItems(
      sinusoidal,
      records,
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      absoluteItems.find(
        (item) => item.registryId === "concept.learned-positional-embeddings",
      )?.href,
    ).toBe("/docs/glossary/learned-positional-embeddings");
    expect(
      absoluteItems.find(
        (item) =>
          item.registryId === "concept.sinusoidal-positional-embeddings",
      )?.href,
    ).toBe("/docs/glossary/sinusoidal-positional-embeddings");
    expect(
      learnedItems.find(
        (item) => item.registryId === "concept.absolute-positional-embeddings",
      )?.href,
    ).toBe("/docs/glossary/absolute-positional-embeddings");
    expect(
      sinusoidalItems.find(
        (item) => item.registryId === "concept.absolute-positional-embeddings",
      )?.href,
    ).toBe("/docs/glossary/absolute-positional-embeddings");
  });

  test("new pages render published glossary content with family navigation", async () => {
    for (const slug of [
      "absolute-positional-embeddings",
      "learned-positional-embeddings",
      "sinusoidal-positional-embeddings",
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
      expect(html).toContain('href="/docs/concepts/positional-encodings"');
      expect(html).toContain('href="/tags/foundations"');
    }

    const absolutePage = await loadGlossaryPage(
      "absolute-positional-embeddings",
    );
    const absoluteHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: absolutePage.messages,
        assets: absolutePage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: absolutePage.content,
      }),
    );

    expect(absoluteHtml).toContain(
      'href="/docs/glossary/learned-positional-embeddings"',
    );
    expect(absoluteHtml).toContain(
      'href="/docs/glossary/sinusoidal-positional-embeddings"',
    );
  });
});
