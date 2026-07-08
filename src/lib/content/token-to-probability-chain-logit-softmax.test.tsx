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

const LOGIT_GLOSSARY_URL = "/docs/glossary/logit";
const SOFTMAX_CONCEPT_URL = "/docs/concepts/softmax";
const SOFTMAX_GLOSSARY_URL = "/docs/glossary/softmax";

describe("Phase 2 logit and softmax glossary pages (US-005)", () => {
  test("logit registry connects from tensor and forward to softmax", () => {
    const logit = getConceptById("concept.logit");
    expect(logit?.prerequisiteIds).toContain("concept.tensor");
    expect(logit?.relatedIds).toContain("concept.softmax");
  });

  test("softmax registry lists logit as prerequisite", () => {
    const softmax = getConceptById("concept.softmax");
    expect(softmax?.prerequisiteIds).toContain("concept.logit");
  });

  test("logit page renders math and forward link to softmax", async () => {
    const page = await loadGlossaryPage("logit");
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

    expect(html).toContain("Logit");
    expect(html).toContain("What It Is");
    expect(html).toContain('class="katex"');
    expect(html).toContain(`href="${SOFTMAX_CONCEPT_URL}"`);
    expect(html).toContain(DERIVED_RELATED_DOC_GROUP_LABELS[CURATED_RELATED]);
  });

  test("softmax page renders math example and required sections", async () => {
    const page = await loadGlossaryPage("softmax");
    expect(page.frontmatter.status).toBe("published");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("Softmax");
    expect(html).toContain("What It Is");
    expect(html).toContain('class="katex"');
    expect(html).toContain("katex-display");
  });
});

describe("Phase 2 logit and softmax search discoverability (US-005)", () => {
  test("search finds logit glossary for logits alias query", async () => {
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
        return client.search("logits");
      },
    );

    expect(results.some((result) => result.url === LOGIT_GLOSSARY_URL)).toBe(
      true,
    );
  });

  test("search ranks softmax concept page first for Softmax title query", async () => {
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
        return client.search("Softmax");
      },
    );

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(SOFTMAX_CONCEPT_URL);
  });
});
