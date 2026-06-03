import { describe, expect, test } from "bun:test";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { exportOramaIndexSnapshot } from "@/lib/search/orama-index";

describe("exportOramaIndexSnapshot", () => {
  test("produces a static Orama snapshot for published docs", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const snapshot = await exportOramaIndexSnapshot(documents);

    expect(snapshot.version).toBe(1);
    expect(snapshot.documents.length).toBeGreaterThanOrEqual(2);
    expect(snapshot.orama).toBeDefined();
    const urls = snapshot.documents.map((document) => document.url);
    expect(urls).toContain("/docs/modules/grouped-query-attention");
    expect(urls).toContain("/docs/glossary/token");
  });
});
