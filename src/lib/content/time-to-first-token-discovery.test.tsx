import { describe, expect, setDefaultTimeout, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

setDefaultTimeout(15_000);

const TTFT_URL = "/docs/glossary/time-to-first-token";

const EXPECTED_CURATED_RELATED = [
  {
    registryId: "concept.prefill",
    href: "/docs/concepts/prefill",
  },
  {
    registryId: "concept.decode",
    href: "/docs/glossary/decode",
  },
  {
    registryId: "concept.kv-cache",
    href: "/docs/concepts/kv-cache",
  },
  {
    registryId: "concept.prefill-decode-split",
    href: "/docs/concepts/prefill-decode-split",
  },
  {
    registryId: "system.continuous-batching",
    href: "/docs/systems/continuous-batching",
  },
  {
    registryId: "system.memory",
    href: "/docs/systems/memory",
  },
  {
    registryId: "system.deployment",
    href: "/docs/systems/deployment",
  },
  {
    registryId: "system.inference-engine",
    href: "/docs/systems/inference-engine",
  },
] as const;

const TTFT_SEARCH_GATE_TIMEOUT_MS = 30_000;

describe("time to first token serving foundations (time-to-first-token-serving-metric-page-003)", () => {
  test("curated related links resolve to published serving foundation pages only", () => {
    const source = getConceptById("concept.time-to-first-token");
    if (!source) {
      throw new Error("expected concept.time-to-first-token in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    for (const expected of EXPECTED_CURATED_RELATED) {
      expect(
        items.some(
          (item) =>
            item.registryId === expected.registryId &&
            item.href === expected.href,
        ),
      ).toBe(true);
    }

    expect(
      items.some((item) => item.registryId.includes("dynamic-batching")),
    ).toBe(false);
    expect(
      items.some((item) => item.registryId.includes("request-scheduling")),
    ).toBe(false);
  });

  test("search index records TTFT glossary page with aliases and tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find((entry) => entry.url === TTFT_URL);
    expect(document?.kind).toBe("glossary");
    expect(document?.facets.kind).toBe("glossary");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "TTFT",
        "time to first token",
        "first token latency",
        "serving latency",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["foundations", "kv-cache"]),
    );
  });

  test(
    "search finds TTFT by title, aliases, and serving-metric terms",
    async () => {
      for (const query of [
        "Time To First Token",
        "TTFT",
        "time to first token",
        "first token latency",
        "serving latency",
      ] as const) {
        const results = await docsSearchApi.search(query);
        expect(results.some((result) => result.url === TTFT_URL)).toBe(true);
      }
    },
    { timeout: TTFT_SEARCH_GATE_TIMEOUT_MS },
  );

  test("rendered related sections expose serving foundations and omit batch-owned pages", async () => {
    const page = await loadGlossaryPage("time-to-first-token");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('data-testid="curated-related-docs"');
    for (const expected of EXPECTED_CURATED_RELATED) {
      expect(html).toContain(`href="${expected.href}"`);
    }
    expect(html).not.toContain('href="/docs/systems/dynamic-batching"');
    expect(html).not.toContain('href="/docs/systems/request-scheduling"');
    expect(html).not.toContain("placeholder");
  });
});
