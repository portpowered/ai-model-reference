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

const pageDir = getDocsPageDir("glossary", "throughput-vs-latency");
const messagesPath = join(pageDir, "messages/en.json");

describe("throughput vs latency glossary contract (throughput-vs-latency-serving-metric-page-001)", () => {
  test("registry record is published with glossary routing, serving aliases, and related ids", () => {
    const record = getConceptById("concept.throughput-vs-latency");

    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.slug).toBe("throughput-vs-latency");
    expect(record?.defaultTitleKey).toBe("title");
    expect(record?.defaultSummaryKey).toBe("description");
    expect(record?.aliases).toEqual([
      "Throughput Vs Latency",
      "throughput vs latency",
      "latency throughput tradeoff",
      "serving throughput",
      "concurrency latency tradeoff",
      "throughput-latency tradeoff",
    ]);
    expect(record?.tags).toEqual(["foundations", "kv-cache"]);
    expect(record?.relatedIds).toEqual([
      "concept.time-to-first-token",
      "concept.inter-token-latency",
      "concept.tokens-per-second",
      "concept.prefill",
      "concept.decode",
      "concept.kv-cache",
      "concept.prefill-decode-split",
      "system.batching",
      "system.continuous-batching",
      "system.dynamic-batching",
      "system.request-scheduling",
      "system.memory",
      "system.deployment",
      "system.inference-engine",
    ]);
    expect(record?.citationIds).toEqual([
      "citation.orca-serving-system",
      "citation.brown-gpt-3",
    ]);
    expect(record?.sidebarGrouping?.glossary).toBe("sequence-and-attention");
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.throughput-vs-latency"),
    ).toBe(true);
  });

  test("glossary page frontmatter and messages align with the registry contract", async () => {
    const page = await loadGlossaryPage("throughput-vs-latency");
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.throughput-vs-latency");
    expect(page.frontmatter.tags).toEqual(["foundations", "kv-cache"]);
    expect(page.frontmatter.aliases).toEqual([
      "Throughput Vs Latency",
      "throughput vs latency",
      "latency throughput tradeoff",
      "serving throughput",
      "concurrency latency tradeoff",
      "throughput-latency tradeoff",
    ]);
    expect(messages.title).toBe("Throughput Vs Latency");
    expect(messages.description).toContain("aggregate completed work");
  });

  test("published pages and search documents expose the glossary route as canonical throughput-vs-latency discovery", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    expect(
      pages.some(
        (entry) => entry.docsSlug === "glossary/throughput-vs-latency",
      ),
    ).toBe(true);

    const document = documents.find(
      (entry) => entry.url === "/docs/glossary/throughput-vs-latency",
    );
    expect(document?.kind).toBe("glossary");
    expect(document?.facets.kind).toBe("glossary");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "throughput vs latency",
        "latency throughput tradeoff",
        "serving throughput",
        "concurrency latency tradeoff",
        "throughput-latency tradeoff",
      ]),
    );
  });
});
