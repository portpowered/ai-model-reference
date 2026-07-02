import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import { getConceptById } from "@/lib/content/registry-runtime";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";

const pageDir = getDocsPageDir("glossary", "tokens-per-second");
const messagesPath = join(pageDir, "messages/en.json");

describe("tokens per second glossary contract (tokens-per-second-glossary-page-001)", () => {
  test("registry record is published with glossary routing, throughput aliases, and related ids", () => {
    const record = getConceptById("concept.tokens-per-second");

    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.slug).toBe("tokens-per-second");
    expect(record?.defaultTitleKey).toBe("title");
    expect(record?.defaultSummaryKey).toBe("description");
    expect(record?.aliases).toEqual([
      "Tokens Per Second",
      "tokens per second",
      "tokens/s",
      "tok/s",
      "TPS",
      "throughput",
      "generation throughput",
    ]);
    expect(record?.tags).toEqual(["foundations", "kv-cache"]);
    expect(record?.relatedIds).toEqual([
      "concept.time-to-first-token",
      "concept.inter-token-latency",
      "concept.prefill",
      "concept.decode",
      "concept.kv-cache",
      "concept.prefill-decode-split",
      "system.batching",
      "system.continuous-batching",
      "system.request-scheduling",
      "system.memory",
      "system.inference-engine",
    ]);
    expect(record?.citationIds).toEqual([
      "citation.orca-serving-system",
      "citation.brown-gpt-3",
    ]);
    expect(record?.sidebarGrouping?.glossary).toBe("sequence-and-attention");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.tokens-per-second")).toBe(
      true,
    );
  });

  test("glossary page frontmatter and messages align with the registry contract", async () => {
    const page = await loadGlossaryPage("tokens-per-second");
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.tokens-per-second");
    expect(page.frontmatter.tags).toEqual(["foundations", "kv-cache"]);
    expect(page.frontmatter.aliases).toEqual([
      "Tokens Per Second",
      "tokens per second",
      "tokens/s",
      "tok/s",
      "TPS",
      "throughput",
      "generation throughput",
    ]);
    expect(messages.title).toBe("Tokens Per Second");
    expect(messages.description).toContain("throughput");
    expect(messages.description).toContain("measurement window");
  });

  test("published pages and search documents expose the glossary route as canonical tokens/s discovery", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    expect(
      pages.some((entry) => entry.docsSlug === "glossary/tokens-per-second"),
    ).toBe(true);

    const document = documents.find(
      (entry) => entry.url === "/docs/glossary/tokens-per-second",
    );
    expect(document?.kind).toBe("glossary");
    expect(document?.facets.kind).toBe("glossary");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "tokens per second",
        "tokens/s",
        "tok/s",
        "TPS",
        "throughput",
        "generation throughput",
      ]),
    );
  });
});
