import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadConceptPage } from "@/lib/content/concept-page";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  getPublishedDocsEntryByRegistryId,
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
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "concept.activation";
const SLUG = "activation";
const PAGE_URL = "/docs/concepts/activation";

const pageDir = getDocsPageDir("concepts", SLUG);
const messagesPath = join(pageDir, "messages/en.json");

const DISCOVERY_ALIAS_QUERIES = [
  "activation",
  "activations",
  "hidden activation",
  "layer output",
] as const;

const INBOUND_DISCOVERY_SOURCES = [
  "module.relu",
  "module.feed-forward-network",
] as const;

function pageBaseUrlFromResults(
  results: Array<{ url: string }>,
  pageUrl: string,
): boolean {
  return results.some(
    (result) =>
      pageBaseUrl(result.url) === pageUrl ||
      result.url.startsWith(`${pageUrl}#`),
  );
}

/**
 * Routine page-bundle checks (frontmatter, messages, registryId, tags, assets)
 * are covered by `validateDerivedPublishedPageBundles` via `validateRegistryContent`.
 * These tests stay focused on published-docs resolution, search discovery, and
 * inbound curated-related routing for the activation concept slice.
 */
describe("activation concept slice verification (activation-concept-current-main-page-004)", () => {
  test("canonical route resolves to the published registry record and default English messages", async () => {
    const entry = getPublishedDocsEntryByRegistryId(REGISTRY_ID);
    const page = await loadConceptPage(SLUG);
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const record = getConceptById(REGISTRY_ID);

    expect(entry).toMatchObject({
      registryId: REGISTRY_ID,
      url: PAGE_URL,
      section: "concepts",
      docsSlug: "concepts/activation",
    });
    expect(record?.status).toBe("published");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("concept");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
  });

  test("published English docs loader resolves the canonical route from pageDir", async () => {
    const pages = await loadPublishedDocsPages("en");
    const page = pages.find((entry) => entry.pageDir === pageDir);

    expect(page?.url).toBe(PAGE_URL);
    expect(page?.docsSlug).toBe("concepts/activation");
    expect(page?.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page?.frontmatter.kind).toBe("concept");
    expect(page?.messages.title).toBe("Activation");
  });

  test("search document and live search resolve the canonical activation concept page", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find((entry) => entry.url === PAGE_URL);

    expect(document).toBeDefined();
    expect(document?.registryId).toBe(REGISTRY_ID);
    expect(document?.kind).toBe("concept");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "activations",
        "hidden activation",
        "layer output",
      ]),
    );

    for (const query of DISCOVERY_ALIAS_QUERIES) {
      const results = await docsSearchApi.search(query);
      expect(results.length).toBeGreaterThan(0);
      expect(pageBaseUrlFromResults(results, PAGE_URL)).toBe(true);
    }
  });

  test("nearby activation-family and feed-forward pages route concept.activation to the canonical concept page", () => {
    const relatedRecords = listRelatedRegistryRecords();

    for (const registryId of INBOUND_DISCOVERY_SOURCES) {
      const record = relatedRecords.find((entry) => entry.id === registryId);
      if (!record) {
        throw new Error(`expected ${registryId} in registry`);
      }

      expect(record.relatedIds).toContain(REGISTRY_ID);

      const items = deriveCuratedRelatedItems(
        record,
        relatedRecords,
        PUBLISHED_DOCS_REGISTRY_IDS,
      );

      expect(items.find((item) => item.registryId === REGISTRY_ID)?.href).toBe(
        PAGE_URL,
      );
    }
  });
});
