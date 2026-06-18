import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadPublishedDocsPagesSync } from "@/lib/content/pages";
import {
  getPublishedDocsEntriesBySlug,
  getPublishedDocsEntryByRegistryId,
  getPublishedDocsHrefForRecord,
  listPublishedDocsEntries,
  MODULE_BACKED_CONCEPT_REGISTRY_IDS,
  PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { buildPublishedDocsIndex } from "@/lib/content/published-docs-registry-source";

function writePage(
  rootDir: string,
  docsSlug: string,
  frontmatter: {
    kind: string;
    registryId: string;
    status: string;
  },
) {
  const pageDir = join(rootDir, docsSlug);
  mkdirSync(join(pageDir, "messages"), { recursive: true });
  writeFileSync(
    join(pageDir, "page.mdx"),
    `---
kind: "${frontmatter.kind}"
registryId: "${frontmatter.registryId}"
messageNamespace: "local"
assetNamespace: "local"
tags:
  - sample
status: ${frontmatter.status}
updatedAt: "2026-06-19"
---
`,
  );
  writeFileSync(
    join(pageDir, "messages", "en.json"),
    JSON.stringify({
      title: frontmatter.registryId,
      description: `${frontmatter.registryId} description`,
    }),
  );
}

describe("published-docs-registry-ids", () => {
  test("index includes every scanned published page registry id with route metadata", () => {
    const pages = loadPublishedDocsPagesSync("en");
    const index = buildPublishedDocsIndex(pages);

    expect(index.entries).toHaveLength(pages.length);
    expect(index.registryIds.size).toBe(pages.length);

    for (const page of pages) {
      const entry = index.byRegistryId.get(page.frontmatter.registryId);
      expect(entry).toBeDefined();
      expect(entry?.docsSlug).toBe(page.docsSlug);
      expect(entry?.url).toBe(page.url);
      expect(entry?.pageKind).toBe(page.frontmatter.kind);
    }
  });

  test("scanner-backed index excludes draft and archived pages", () => {
    const docsRoot = mkdtempSync(join(tmpdir(), "published-docs-index-"));

    writePage(docsRoot, "glossary/published-entry", {
      kind: "glossary",
      registryId: "concept.published-entry",
      status: "published",
    });
    writePage(docsRoot, "glossary/draft-entry", {
      kind: "glossary",
      registryId: "concept.draft-entry",
      status: "draft",
    });
    writePage(docsRoot, "glossary/archived-entry", {
      kind: "glossary",
      registryId: "concept.archived-entry",
      status: "archived",
    });

    const pages = loadPublishedDocsPagesSync("en", docsRoot);
    const index = buildPublishedDocsIndex(pages);

    expect(index.entries.map((entry) => entry.registryId)).toEqual([
      "concept.published-entry",
    ]);
  });

  test("derived runtime exposes published page lookup by registry id and slug", () => {
    const entry = getPublishedDocsEntryByRegistryId(
      "module.grouped-query-attention",
    );
    expect(entry?.section).toBe("modules");
    expect(entry?.pageKind).toBe("module");

    const quantizationPages = getPublishedDocsEntriesBySlug("quantization");
    expect(quantizationPages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          registryId: "concept.quantization",
          section: "concepts",
          pageKind: "concept",
        }),
      ]),
    );
  });

  test("derived compatibility sets come from published page discovery", () => {
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("module.grouped-query-attention"),
    ).toBe(true);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("concept.feed-forward-network"),
    ).toBe(true);
    expect(
      PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS.has("concept.quantization"),
    ).toBe(true);
    expect(
      MODULE_BACKED_CONCEPT_REGISTRY_IDS.has("concept.feed-forward-network"),
    ).toBe(true);
    expect(PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS.has("concept.token")).toBe(
      false,
    );
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.token")).toBe(true);
    expect(
      listPublishedDocsEntries().some(
        (publishedPage) =>
          publishedPage.registryId === "concept.token" &&
          publishedPage.section === "glossary",
      ),
    ).toBe(true);
  });

  test("published docs href lookup resolves module-backed, concept-section, and glossary concepts", () => {
    expect(
      getPublishedDocsHrefForRecord({
        id: "concept.feed-forward-network",
        slug: "feed-forward-network",
        kind: "concept",
      }),
    ).toBe("/docs/modules/feed-forward-network");
    expect(
      getPublishedDocsHrefForRecord({
        id: "concept.quantization",
        slug: "quantization",
        kind: "concept",
      }),
    ).toBe("/docs/concepts/quantization");
    expect(
      getPublishedDocsHrefForRecord({
        id: "concept.token",
        slug: "token",
        kind: "concept",
      }),
    ).toBe("/docs/glossary/token");
  });
});
