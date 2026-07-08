import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  createDocsSearchClient,
  DOCS_SEARCH_API_PATH,
} from "@/features/docs/search/search-client";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { getConceptById } from "@/lib/content/registry-runtime";
import {
  CURATED_RELATED,
  DERIVED_RELATED_DOC_GROUP_LABELS,
} from "@/lib/content/related-docs";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { docsSearchApi } from "@/lib/search/search-server";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";
import { withGlobalFetchOverride } from "@/tests/shared/global-fetch-lock";

const ENTROPY_GLOSSARY_URL = "/docs/glossary/entropy";
const TEMPERATURE_GLOSSARY_URL = "/docs/glossary/temperature";

const ENTROPY_BODY_PHRASE =
  "Shannon entropy of the next-token distribution at decode time";
const TEMPERATURE_BODY_PHRASE =
  "temperature scaling divides logits before softmax at sample time";

describe("Phase 2 entropy and temperature glossary pages (US-006)", () => {
  test("entropy registry lists softmax as prerequisite and forward to temperature", () => {
    const entropy = getConceptById("concept.entropy");
    expect(entropy?.prerequisiteIds).toContain("concept.softmax");
    expect(entropy?.relatedIds).toContain("concept.temperature");
  });

  test("temperature registry links to softmax via relatedIds", () => {
    const temperature = getConceptById("concept.temperature");
    expect(temperature?.prerequisiteIds).toContain("concept.softmax");
    expect(temperature?.relatedIds).toContain("concept.softmax");
  });

  test("entropy page renders math example and required sections", async () => {
    const page = await loadGlossaryPage("entropy");
    expect(page.frontmatter.status).toBe("published");
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("Entropy");
    expect(html).toContain("What It Is");
    expect(html).toContain('class="katex"');
    expect(html).toContain("katex-display");
    expect(html).toContain('href="/docs/glossary/temperature"');
    expect(html).toContain(DERIVED_RELATED_DOC_GROUP_LABELS[CURATED_RELATED]);
  });

  test("temperature page explains softmax sharpness and links to softmax", async () => {
    const page = await loadGlossaryPage("temperature");
    expect(page.frontmatter.status).toBe("published");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("Temperature");
    expect(html).toContain("What It Is");
    expect(html).toContain("softmax(z / T)");
    expect(html).toContain("probabilities move closer together");
    expect(html).toContain('href="/docs/glossary/softmax"');
    expect(html).toContain(DERIVED_RELATED_DOC_GROUP_LABELS[CURATED_RELATED]);
  });
});

describe("Phase 2 entropy and temperature search discoverability (US-006)", () => {
  test("search ranks entropy glossary first for Entropy title query", async () => {
    const exported = await (await docsSearchApi.staticGET()).json();
    const metaByUrl = searchResultMetaMapToRecord(
      await loadSearchResultMetaMap(),
    );
    const results = await withGlobalFetchOverride(
      (async () =>
        new Response(JSON.stringify(exported), {
          status: 200,
        })) as unknown as typeof fetch,
      async () => {
        const client = createDocsSearchClient({
          metaByUrl,
          client: { from: DOCS_SEARCH_API_PATH },
        });
        return client.search("Entropy");
      },
    );

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(ENTROPY_GLOSSARY_URL);
  });

  test("search ranks temperature glossary first for Temperature title query", async () => {
    const exported = await (await docsSearchApi.staticGET()).json();
    const metaByUrl = searchResultMetaMapToRecord(
      await loadSearchResultMetaMap(),
    );
    const results = await withGlobalFetchOverride(
      (async () =>
        new Response(JSON.stringify(exported), {
          status: 200,
        })) as unknown as typeof fetch,
      async () => {
        const client = createDocsSearchClient({
          metaByUrl,
          client: { from: DOCS_SEARCH_API_PATH },
        });
        return client.search("Temperature");
      },
    );

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(TEMPERATURE_GLOSSARY_URL);
  });

  test("search finds entropy glossary for distinctive body phrase", async () => {
    const exported = await (await docsSearchApi.staticGET()).json();
    const metaByUrl = searchResultMetaMapToRecord(
      await loadSearchResultMetaMap(),
    );
    const results = await withGlobalFetchOverride(
      (async () =>
        new Response(JSON.stringify(exported), {
          status: 200,
        })) as unknown as typeof fetch,
      async () => {
        const client = createDocsSearchClient({
          metaByUrl,
          client: { from: DOCS_SEARCH_API_PATH },
        });
        return client.search(ENTROPY_BODY_PHRASE);
      },
    );

    expect(results.some((result) => result.url === ENTROPY_GLOSSARY_URL)).toBe(
      true,
    );
  });

  test("search finds temperature glossary for distinctive body phrase", async () => {
    const exported = await (await docsSearchApi.staticGET()).json();
    const metaByUrl = searchResultMetaMapToRecord(
      await loadSearchResultMetaMap(),
    );
    const results = await withGlobalFetchOverride(
      (async () =>
        new Response(JSON.stringify(exported), {
          status: 200,
        })) as unknown as typeof fetch,
      async () => {
        const client = createDocsSearchClient({
          metaByUrl,
          client: { from: DOCS_SEARCH_API_PATH },
        });
        return client.search(TEMPERATURE_BODY_PHRASE);
      },
    );

    expect(
      results.some((result) => result.url === TEMPERATURE_GLOSSARY_URL),
    ).toBe(true);
  });
});
