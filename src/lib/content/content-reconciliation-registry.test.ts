import { describe, expect, test } from "bun:test";
import { loadPublishedDocsPages } from "./pages";
import {
  MODULE_BACKED_CONCEPT_REGISTRY_IDS,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "./published-docs-registry-ids";
import type { RegistryRecord } from "./registry";
import { loadRegistry } from "./registry";
import { hasPublishedDocsPageForRecord } from "./registry-linking";
import {
  validateColocatedPageBundle,
  validateRegistryContent,
} from "./validate-registry";

/** Attention modules expected after Phase 2/3 parallel slices land. */
const EXPECTED_ATTENTION_MODULE_IDS = [
  "module.attention",
  "module.causal-attention",
  "module.multi-head-attention",
  "module.multi-query-attention",
  "module.grouped-query-attention",
  "module.multi-head-latent-attention",
  "module.sparse-attention",
  "module.sliding-window-attention",
  "module.linear-attention",
] as const;

function resolveTag(
  indexes: Awaited<ReturnType<typeof loadRegistry>>,
  tagRef: string,
): RegistryRecord | undefined {
  const bySlug = indexes.bySlug.get(tagRef);
  if (bySlug?.kind === "tag") {
    return bySlug;
  }
  const tagId = tagRef.startsWith("tag.") ? tagRef : `tag.${tagRef}`;
  const byId = indexes.byId.get(tagId);
  if (byId?.kind === "tag") {
    return byId;
  }
  return undefined;
}

describe("Phase 2/3 reconciliation registry validation (US-001)", () => {
  test("validateRegistryContent passes with zero errors for integrated content", async () => {
    const errors = await validateRegistryContent();
    expect(errors).toEqual([]);
  });

  test("every published docs page resolves registryId, messages, and colocated assets", async () => {
    const indexes = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");

    expect(pages.length).toBeGreaterThan(0);

    for (const page of pages) {
      const record = indexes.byId.get(page.frontmatter.registryId);
      expect(record).toBeDefined();

      const bundle = await validateColocatedPageBundle(page.pageDir, indexes);
      expect(bundle.errors).toEqual([]);

      for (const tagRef of page.frontmatter.tags) {
        expect(resolveTag(indexes, tagRef)).toBeDefined();
      }
    }
  });

  test("published docs registry ids match every published page frontmatter registryId", async () => {
    const indexes = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const pageRegistryIds = new Set(
      pages.map((page) => page.frontmatter.registryId),
    );

    for (const page of pages) {
      expect(PUBLISHED_DOCS_REGISTRY_IDS.has(page.frontmatter.registryId)).toBe(
        true,
      );
    }

    for (const registryId of PUBLISHED_DOCS_REGISTRY_IDS) {
      const record = indexes.byId.get(registryId);
      expect(record).toBeDefined();
      if (!record) {
        continue;
      }
      expect(
        hasPublishedDocsPageForRecord(record, PUBLISHED_DOCS_REGISTRY_IDS),
      ).toBe(true);
      if (MODULE_BACKED_CONCEPT_REGISTRY_IDS.has(registryId)) {
        const moduleRegistryId = registryId.replace(/^concept\./, "module.");
        expect(pageRegistryIds.has(moduleRegistryId)).toBe(true);
      }
    }
  });

  test("published records resolve tag references on modules and concepts", async () => {
    const indexes = await loadRegistry();

    for (const record of indexes.byId.values()) {
      if (record.status !== "published") {
        continue;
      }
      if (record.kind !== "module" && record.kind !== "concept") {
        continue;
      }

      for (const tagRef of record.tags) {
        expect(resolveTag(indexes, tagRef)).toBeDefined();
      }
    }
  });

  test("expected attention modules are published with attention tag", async () => {
    const indexes = await loadRegistry();

    for (const id of EXPECTED_ATTENTION_MODULE_IDS) {
      const record = indexes.byId.get(id);
      expect(record?.kind).toBe("module");
      expect(record?.status).toBe("published");
      expect(record?.tags).toContain("attention");
    }
  });
});
