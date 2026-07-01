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

const pageDir = getDocsPageDir("glossary", "time-to-first-token");
const messagesPath = join(pageDir, "messages/en.json");

describe("time to first token glossary contract (time-to-first-token-serving-metric-page-001)", () => {
  test("registry record is published with glossary routing, serving aliases, and related ids", () => {
    const record = getConceptById("concept.time-to-first-token");

    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.slug).toBe("time-to-first-token");
    expect(record?.defaultTitleKey).toBe("title");
    expect(record?.defaultSummaryKey).toBe("description");
    expect(record?.aliases).toEqual([
      "Time To First Token",
      "TTFT",
      "time to first token",
      "first token latency",
      "serving latency",
    ]);
    expect(record?.tags).toEqual(["foundations", "kv-cache"]);
    expect(record?.relatedIds).toEqual([
      "concept.prefill",
      "concept.decode",
      "concept.kv-cache",
      "concept.prefill-decode-split",
      "system.continuous-batching",
      "system.memory",
      "system.deployment",
      "system.inference-engine",
    ]);
    expect(record?.citationIds).toEqual([
      "citation.orca-serving-system",
      "citation.brown-gpt-3",
    ]);
    expect(record?.sidebarGrouping?.glossary).toBe("sequence-and-attention");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.time-to-first-token")).toBe(
      true,
    );
  });

  test("glossary page frontmatter and messages align with the registry contract", async () => {
    const page = await loadGlossaryPage("time-to-first-token");
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(page.frontmatter.kind).toBe("glossary");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.time-to-first-token");
    expect(page.frontmatter.tags).toEqual(["foundations", "kv-cache"]);
    expect(page.frontmatter.aliases).toEqual([
      "Time To First Token",
      "TTFT",
      "time to first token",
      "first token latency",
      "serving latency",
    ]);
    expect(messages.title).toBe("Time To First Token");
    expect(messages.description).toContain("first generated token");
  });

  test("published pages and search documents expose the glossary route as canonical TTFT discovery", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    expect(
      pages.some((entry) => entry.docsSlug === "glossary/time-to-first-token"),
    ).toBe(true);

    const document = documents.find(
      (entry) => entry.url === "/docs/glossary/time-to-first-token",
    );
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
  });
});
