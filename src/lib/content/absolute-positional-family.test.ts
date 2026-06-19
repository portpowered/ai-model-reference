import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { loadModulePage } from "@/lib/content/module-page";
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
    ).toBe("/docs/modules/learned-positional-embeddings");
    expect(
      absoluteItems.find(
        (item) =>
          item.registryId === "concept.sinusoidal-positional-embeddings",
      )?.href,
    ).toBe("/docs/modules/sinusoidal-positional-embeddings");
    expect(
      learnedItems.find(
        (item) => item.registryId === "concept.absolute-positional-embeddings",
      )?.href,
    ).toBe("/docs/concepts/absolute-positional-embeddings");
    expect(
      sinusoidalItems.find(
        (item) => item.registryId === "concept.absolute-positional-embeddings",
      )?.href,
    ).toBe("/docs/concepts/absolute-positional-embeddings");
  });

  test("absolute concept page renders the family explanation and navigation", async () => {
    const page = await loadConceptPage("absolute-positional-embeddings");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe(
      "concept.absolute-positional-embeddings",
    );
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "fixed index",
    );
    expect(html).toContain("What It Is");
    expect(html).toContain("Family Split");
    expect(html).toContain("Learned positional embeddings");
    expect(html).toContain("Sinusoidal positional embeddings");
    expect(html).toContain('href="/docs/concepts/positional-encodings"');
    expect(html).toContain(
      'href="/docs/modules/learned-positional-embeddings"',
    );
    expect(html).toContain(
      'href="/docs/modules/sinusoidal-positional-embeddings"',
    );
    expect(html).toContain('href="/docs/modules/relative-position-bias"');
    expect(html).toContain('href="/docs/modules/rope"');
    expect(html).toContain('href="/docs/modules/alibi"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
  });

  test("learned and sinusoidal module pages keep their family navigation intact", async () => {
    for (const slug of [
      "learned-positional-embeddings",
      "sinusoidal-positional-embeddings",
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
      expect(html).toContain(
        'href="/docs/modules/absolute-positional-embeddings"',
      );
      expect(html).toContain('href="/docs/concepts/positional-encodings"');
      expect(html).toContain('href="/tags/foundations"');
    }
  });
});
