import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { DECODE_CONCEPT_PAGE_DIR } from "@/lib/content/content-paths";
import { localDocsRoute } from "@/lib/content/local-docs-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";
import { validateColocatedPageBundle } from "./validate-registry";

const pageDir = DECODE_CONCEPT_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");
const DECODE_ROUTE = "/docs/concepts/decode";

describe("decode concept page focused validation (decode-concept-page-004)", () => {
  test("canonical route, registry record, and default English page bundle resolve together", async () => {
    const route = localDocsRoute({
      section: "concepts",
      slug: "decode",
    });
    const registry = await loadRegistry();
    const bundle = await validateColocatedPageBundle(pageDir, registry);
    const record = registry.byId.get("concept.decode");

    expect(route).toBe(DECODE_ROUTE);
    expect(bundle.errors).toEqual([]);
    expect(bundle.messages?.title).toBe("Decode");
    expect(bundle.messages?.openingSummary?.length).toBeGreaterThan(0);
    expect(bundle.assets).toBeDefined();
    expect(record?.kind).toBe("concept");
    expect(record?.slug).toBe("decode");
    expect(record?.status).toBe("published");
  });

  test("registry record stays published and points curated discovery at the broad concept surface", () => {
    const record = getConceptById("concept.decode");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "Decode",
      "decoding",
      "token-by-token generation",
      "next-token step",
      "inter-token generation",
      "inter-token latency",
    ]);
    expect(record?.tags).toEqual(["foundations", "attention", "kv-cache"]);
    expect(record?.relatedIds).toEqual(
      expect.arrayContaining([
        "concept.prefill",
        "concept.kv-cache",
        "concept.prefill-decode-split",
        "system.batching",
        "system.continuous-batching",
        "system.memory",
        "system.speculative-decoding",
        "concept.autoregressive-generation",
        "concept.sampling-overview",
      ]),
    );
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.decode")).toBe(true);
    expect(PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS.has("concept.decode")).toBe(
      true,
    );
  });

  test("curated related links resolve decode neighbors through their published routes", () => {
    const source = getConceptById("concept.decode");
    if (!source) {
      throw new Error("expected concept.decode in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.prefill")?.href,
    ).toBe("/docs/concepts/prefill");
    expect(
      items.find((item) => item.registryId === "concept.kv-cache")?.href,
    ).toBe("/docs/concepts/kv-cache");
    expect(
      items.find((item) => item.registryId === "concept.sampling-overview")
        ?.href,
    ).toBe("/docs/glossary/sampling-overview");
    expect(
      items.find((item) => item.registryId === "system.batching")?.href,
    ).toBe("/docs/systems/batching");
    expect(
      items.find((item) => item.registryId === "system.continuous-batching")
        ?.href,
    ).toBe("/docs/systems/continuous-batching");
    expect(
      items.find((item) => item.registryId === "system.memory")?.href,
    ).toBe("/docs/systems/memory");
    expect(
      items.find((item) => item.registryId === "system.speculative-decoding")
        ?.href,
    ).toBe("/docs/systems/speculative-decoding");
  });

  test("messages explain decode as a repeated stage distinct from prefill and sampling", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Decode");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "autoregressive generation",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "instead of rereading the whole prompt",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "inter-token latency",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "memory bandwidth",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "sampling",
    );
  });

  test("page renders the canonical concept route with serving and discovery links", async () => {
    const page = await loadConceptPage("decode");

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.decode");
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);

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
    expect(html).toContain("Serving Path");
    expect(html).toContain("Related Concepts And Systems");
    expect(html).toContain("Tags");
    expect(html).toContain("References");
    expect(html).toContain("instead of rereading the whole prompt");
    expect(html).toContain('href="/docs/concepts/prefill"');
    expect(html).toContain('href="/docs/concepts/kv-cache"');
    expect(html).toContain('href="/docs/glossary/prefill-decode-split"');
    expect(html).toContain('href="/docs/systems/batching"');
    expect(html).toContain('href="/docs/systems/continuous-batching"');
    expect(html).toContain('href="/docs/systems/memory"');
    expect(html).toContain('href="/docs/systems/speculative-decoding"');
    expect(html).toContain('href="/docs/glossary/sampling-overview"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
  });

  test("published pages and search documents prefer the concept route for decode discovery", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    expect(pages.some((page) => page.docsSlug === "concepts/decode")).toBe(
      true,
    );
    expect(pages.some((page) => page.docsSlug === "glossary/decode")).toBe(
      true,
    );

    const conceptDocument = documents.find(
      (entry) => entry.url === "/docs/concepts/decode",
    );
    expect(conceptDocument?.kind).toBe("concept");
    expect(conceptDocument?.facets.kind).toBe("concept");
    expect(conceptDocument?.aliases).toEqual(
      expect.arrayContaining([
        "Decode",
        "decoding",
        "token-by-token generation",
        "next-token step",
        "inter-token latency",
      ]),
    );
  });

  test("search ranks the concept route first for representative decode queries", async () => {
    for (const query of [
      "decode",
      "decoding",
      "token-by-token generation",
      "next-token step",
      "inter-token latency",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]?.url).toBe(DECODE_ROUTE);
    }
  });
});
