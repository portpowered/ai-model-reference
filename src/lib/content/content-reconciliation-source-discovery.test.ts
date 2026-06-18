import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { DOCS_ROOT } from "@/lib/content/content-paths";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import { source } from "@/lib/source";

/** Batch 017 pages reconciled in Phase 2/3 (see prd.md). */
const BATCH_017_DOCS_URLS = [
  "/docs/glossary/transformer",
  "/docs/glossary/diffusion-model",
  "/docs/glossary/multimodal-model",
  "/docs/glossary/world-model",
  "/docs/modules/attention",
  "/docs/modules/multi-head-attention",
  "/docs/modules/multi-query-attention",
  "/docs/modules/multi-head-latent-attention",
  "/docs/modules/sparse-attention",
  "/docs/modules/sliding-window-attention",
  "/docs/modules/linear-attention",
  "/docs/concepts/transformer-architecture",
  "/docs/glossary/feed-forward-network",
  "/docs/glossary/mixture-of-experts",
  "/docs/glossary/normalization",
  "/docs/glossary/layer-norm",
  "/docs/glossary/rmsnorm",
  "/docs/glossary/residual-connection",
  "/docs/concepts/positional-encodings",
  "/docs/glossary/rope",
  "/docs/glossary/alibi",
  "/docs/glossary/context-window",
  "/docs/concepts/context-extension",
  "/docs/concepts/why-long-context-is-hard",
  "/docs/glossary/silu",
  "/docs/glossary/swiglu",
] as const;

function docsSlugFromUrl(url: string): string[] {
  return url.replace("/docs/", "").split("/");
}

describe("Phase 2/3 reconciliation source discovery (US-002)", () => {
  test("loadPublishedDocsPages includes every batch 017 glossary, concept, and module URL", async () => {
    const pages = await loadPublishedDocsPages("en");
    const urls = new Set(pages.map((page) => page.url));

    for (const url of BATCH_017_DOCS_URLS) {
      expect(urls).toContain(url);
    }
  });

  test("Fumadocs source resolves every batch 017 page slug", () => {
    for (const url of BATCH_017_DOCS_URLS) {
      const slug = docsSlugFromUrl(url);
      const page = source.getPage(slug);
      expect(page).toBeDefined();
      expect(page?.url).toBe(url);
    }
  });

  test("Fumadocs generateParams includes every batch 017 slug path", () => {
    const slugPaths = new Set(
      source.generateParams().map((entry) => entry.slug.join("/")),
    );

    for (const url of BATCH_017_DOCS_URLS) {
      const slugPath = url.replace("/docs/", "");
      expect(slugPaths.has(slugPath)).toBe(true);
    }
  });

  test("every published docs registry id has a routable MDX bundle on disk", async () => {
    const pages = await loadPublishedDocsPages("en");
    const pageByRegistryId = new Map(
      pages.map((page) => [page.frontmatter.registryId, page]),
    );

    for (const registryId of PUBLISHED_DOCS_REGISTRY_IDS) {
      const page = pageByRegistryId.get(registryId);
      expect(page).toBeDefined();
      expect(existsSync(join(page?.pageDir ?? "", "page.mdx"))).toBe(true);
    }
  });

  test("published module and concept registry records with docs pages resolve through source", async () => {
    const indexes = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const pageByRegistryId = new Map(
      pages.map((page) => [page.frontmatter.registryId, page]),
    );

    for (const record of indexes.byId.values()) {
      if (record.status !== "published") {
        continue;
      }
      if (record.kind !== "module" && record.kind !== "concept") {
        continue;
      }
      if (!PUBLISHED_DOCS_REGISTRY_IDS.has(record.id)) {
        continue;
      }

      const page = pageByRegistryId.get(record.id);
      expect(page).toBeDefined();

      const slug = page?.docsSlug.split("/") ?? [];
      expect(source.getPage(slug)).toBeDefined();
      expect(page?.url.startsWith("/docs/")).toBe(true);
      expect(page?.pageDir.startsWith(DOCS_ROOT)).toBe(true);
    }
  });

  test("every published docs page resolves through Fumadocs source and generateParams", async () => {
    const pages = await loadPublishedDocsPages("en");
    const slugPaths = new Set(
      source.generateParams().map((entry) => entry.slug.join("/")),
    );

    for (const page of pages) {
      const slug = page.docsSlug.split("/");
      expect(source.getPage(slug)).toBeDefined();
      expect(slugPaths.has(page.docsSlug)).toBe(true);
    }
  });
});
