/**
 * API and advanced-index contract parity after the generic base document +
 * AI enrichment boundary split. Keep these assertions aligned with shipped
 * `/api/search` behavior and Fumadocs advanced export shape.
 */
import { describe, expect, test } from "bun:test";
import { GET } from "@/app/api/search/route";
import { supportedLocales } from "@/lib/i18n/locale-routing";
import { docsSearchApi } from "@/lib/search/search-server";
import {
  expectUniqueCanonicalPageUrls,
  resultsIncludeUrl,
  SAMPLE_MODULE_URL,
} from "./helpers";

const GQA_URL = SAMPLE_MODULE_URL;
const ATTENTION_MODULE_URL = "/docs/modules/attention";
const RELU_URL = "/docs/modules/relu";
const LEAKY_RELU_URL = "/docs/modules/leaky-relu";

type AdvancedExportPayload = {
  type: string;
  [key: string]: unknown;
};

async function readAdvancedExport(
  requestUrl: string,
): Promise<AdvancedExportPayload> {
  const response = await GET(new Request(requestUrl));
  expect(response.ok).toBe(true);
  return (await response.json()) as AdvancedExportPayload;
}

describe("advanced search export contract", () => {
  test("GET without query returns an advanced export for the default locale", async () => {
    const payload = await readAdvancedExport("http://localhost/api/search");
    expect(payload.type).toBe("advanced");
    expect(payload.index).toBeDefined();
    expect(payload.docs).toBeDefined();
  });

  test.each(
    supportedLocales.filter((locale) => locale !== "en"),
  )("GET without query returns a locale-specific advanced export for %s", async (locale) => {
    const payload = await readAdvancedExport(
      `http://localhost/api/search?locale=${locale}`,
    );
    expect(payload.type).toBe("advanced");
    expect(payload.index).toBeDefined();
    expect(payload.docs).toBeDefined();
  });

  test("docsSearchApi.export matches the route bootstrap shape", async () => {
    const exported = (await docsSearchApi.export()) as AdvancedExportPayload;
    const routed = await readAdvancedExport("http://localhost/api/search");

    expect(exported.type).toBe("advanced");
    expect(routed.type).toBe(exported.type);
    expect(Object.keys(routed).sort()).toEqual(Object.keys(exported).sort());
  });
});

describe("/api/search query contract parity", () => {
  test("GQA query ranks grouped-query attention first", async () => {
    const response = await GET(
      new Request("http://localhost/api/search?query=GQA"),
    );
    expect(response.ok).toBe(true);

    const results = (await response.json()) as Array<{ url: string }>;
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(GQA_URL);
    expectUniqueCanonicalPageUrls(results.map((result) => result.url));
  });

  test("attention query includes grouped-query attention", async () => {
    const response = await GET(
      new Request("http://localhost/api/search?query=attention"),
    );
    expect(response.ok).toBe(true);

    const results = (await response.json()) as Array<{ url: string }>;
    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeUrl(results, ATTENTION_MODULE_URL)).toBe(true);
    expect(resultsIncludeUrl(results, GQA_URL)).toBe(true);
    expectUniqueCanonicalPageUrls(results.map((result) => result.url));
  });

  test("tag-filtered attention query keeps attention-tagged canonical pages", async () => {
    const response = await GET(
      new Request("http://localhost/api/search?query=attention&tag=attention"),
    );
    expect(response.ok).toBe(true);

    const results = (await response.json()) as Array<{ url: string }>;
    const urls = results.map((result) => result.url);
    expect(urls.length).toBeGreaterThan(0);
    expect(resultsIncludeUrl(results, ATTENTION_MODULE_URL)).toBe(true);
    expect(resultsIncludeUrl(results, GQA_URL)).toBe(true);
    expectUniqueCanonicalPageUrls(urls);
  });

  test("classification-scoped activation search returns activation-family modules", async () => {
    const response = await GET(
      new Request("http://localhost/api/search?classification=activation"),
    );
    expect(response.ok).toBe(true);

    const results = (await response.json()) as Array<{ url: string }>;
    const urls = results.map((result) => result.url);
    expect(urls).toEqual(expect.arrayContaining([RELU_URL, LEAKY_RELU_URL]));
    expectUniqueCanonicalPageUrls(urls);
  });
});
