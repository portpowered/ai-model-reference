import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { docsSearchApi } from "@/lib/search/search-server";

const CLIP_URL = "/docs/models/clip";

const CLIP_DISCOVERY_QUERIES = [
  { query: "CLIP", expectFirst: true },
  { query: "contrastive text image model", expectFirst: false },
  { query: "text-image conditioning", expectFirst: false },
  { query: "multimodal encoder", expectFirst: false },
] as const;

async function renderGlossaryPage(slug: string) {
  const page = await loadGlossaryPage(slug);
  return renderToStaticMarkup(
    createElement(
      ModulePageProviders,
      {
        messages: page.messages,
        assets: page.assets,
      },
      page.content,
    ),
  );
}

describe("clip discovery surfaces", () => {
  for (const { query, expectFirst } of CLIP_DISCOVERY_QUERIES) {
    test(`search query ${query} returns the canonical CLIP model page`, async () => {
      const results = await docsSearchApi.search(query);
      const metaMap = await loadSearchResultMetaMap();

      expect(
        results.some((result) => pageBaseUrl(result.url) === CLIP_URL),
      ).toBe(true);
      expect(metaMap.get(CLIP_URL)?.kind).toBe("model");

      if (expectFirst) {
        expect(pageBaseUrl(results[0]?.url ?? "")).toBe(CLIP_URL);
      }
    });
  }

  test("nearby multimodal and image-generation glossary pages link to CLIP through related docs", async () => {
    const pages = await Promise.all([
      renderGlossaryPage("multimodal-model"),
      renderGlossaryPage("conditioning"),
      renderGlossaryPage("diffusion-model"),
    ]);

    for (const html of pages) {
      expect(html).toContain('href="/docs/models/clip"');
    }
  });
});
