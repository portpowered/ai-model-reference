import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadPublishedDocsPagesSync } from "@/lib/content/pages";
import { publishedDocsHrefFromEntry } from "@/lib/content/published-docs-registry-contract";
import {
  getPublishedDocsEntriesBySlug,
  getPublishedDocsEntryByRegistryId,
  getPublishedDocsHrefForRecord,
  listPublishedDocsEntries,
  MODULE_BACKED_CONCEPT_REGISTRY_IDS,
  PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import {
  buildPublishedDocsIndex,
  derivePublishedDocsRegistryIds,
  derivePublishedDocsRuntimeManifest,
} from "@/lib/content/published-docs-registry-source";

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
    expect(index.registryIds.size).toBeLessThanOrEqual(pages.length);

    for (const page of pages) {
      const entry = index.entries.find(
        (candidate) => candidate.docsSlug === page.docsSlug,
      );
      expect(entry).toBeDefined();
      expect(entry?.registryId).toBe(page.frontmatter.registryId);
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

  test("new published page discovery comes from source pages without a manual manifest edit", () => {
    const docsRoot = mkdtempSync(join(tmpdir(), "published-docs-discovery-"));

    writePage(docsRoot, "modules/feed-forward-network", {
      kind: "module",
      registryId: "module.feed-forward-network",
      status: "published",
    });
    writePage(docsRoot, "modules/draft-quantization", {
      kind: "module",
      registryId: "module.grouped-query-attention",
      status: "draft",
    });
    writePage(docsRoot, "glossary/archived-token", {
      kind: "glossary",
      registryId: "concept.token",
      status: "archived",
    });

    const pages = loadPublishedDocsPagesSync("en", docsRoot);
    const index = buildPublishedDocsIndex(pages);
    const derivedRegistryIds = new Set(derivePublishedDocsRegistryIds(index));
    const publishedEntry = index.byRegistryId.get(
      "module.feed-forward-network",
    );

    expect(pages.map((page) => page.frontmatter.registryId)).toEqual([
      "module.feed-forward-network",
    ]);
    expect(publishedEntry).toBeDefined();
    if (!publishedEntry) {
      throw new Error("Expected feed-forward-network module entry");
    }
    expect(publishedEntry).toEqual(
      expect.objectContaining({
        registryId: "module.feed-forward-network",
        slug: "feed-forward-network",
        docsSlug: "modules/feed-forward-network",
        pageKind: "module",
        section: "modules",
      }),
    );
    expect(index.bySlug.get("feed-forward-network")).toEqual([publishedEntry]);
    expect(publishedDocsHrefFromEntry(publishedEntry)).toBe(
      "/docs/modules/feed-forward-network",
    );
    expect(derivedRegistryIds.has("module.feed-forward-network")).toBe(true);
    expect(derivedRegistryIds.has("concept.feed-forward-network")).toBe(true);
    expect(derivedRegistryIds.has("module.grouped-query-attention")).toBe(
      false,
    );
    expect(derivedRegistryIds.has("concept.token")).toBe(false);
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

  test("concept-section entries win registry-id lookup over glossary bridge pages", () => {
    const docsRoot = mkdtempSync(join(tmpdir(), "published-docs-canonical-"));

    writePage(docsRoot, "glossary/kv-cache", {
      kind: "glossary",
      registryId: "concept.kv-cache",
      status: "published",
    });
    writePage(docsRoot, "concepts/kv-cache", {
      kind: "concept",
      registryId: "concept.kv-cache",
      status: "published",
    });

    const pages = loadPublishedDocsPagesSync("en", docsRoot);
    const index = buildPublishedDocsIndex(pages);

    expect(index.entries).toHaveLength(2);
    expect(index.registryIds.size).toBe(1);
    expect(index.byRegistryId.get("concept.kv-cache")).toEqual(
      expect.objectContaining({
        docsSlug: "concepts/kv-cache",
        pageKind: "concept",
        section: "concepts",
      }),
    );
    expect(index.bySlug.get("kv-cache")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          docsSlug: "glossary/kv-cache",
          pageKind: "glossary",
          section: "glossary",
        }),
        expect.objectContaining({
          docsSlug: "concepts/kv-cache",
          pageKind: "concept",
          section: "concepts",
        }),
      ]),
    );
  });

  test("runtime manifest is derived from the scanner-backed source manifest", () => {
    const manifest = derivePublishedDocsRuntimeManifest(
      buildPublishedDocsIndex(loadPublishedDocsPagesSync("en")),
    );

    expect(listPublishedDocsEntries()).toEqual(manifest.entries);
    expect([...PUBLISHED_DOCS_REGISTRY_IDS].sort()).toEqual([
      ...manifest.registryIds,
    ]);
    expect([...PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS].sort()).toEqual([
      ...manifest.publishedConceptSectionRegistryIds,
    ]);
    expect([...MODULE_BACKED_CONCEPT_REGISTRY_IDS].sort()).toEqual([
      ...manifest.moduleBackedConceptRegistryIds,
    ]);
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
    expect(getPublishedDocsEntryByRegistryId("concept.kv-cache")).toEqual(
      expect.objectContaining({
        docsSlug: "concepts/kv-cache",
        pageKind: "concept",
        section: "concepts",
      }),
    );
    expect(
      getPublishedDocsHrefForRecord({
        id: "concept.kv-cache",
        slug: "kv-cache",
        kind: "concept",
      }),
    ).toBe("/docs/concepts/kv-cache");
    expect(
      getPublishedDocsHrefForRecord({
        id: "concept.token",
        slug: "token",
        kind: "concept",
      }),
    ).toBe("/docs/glossary/token");
  });
});
