import { describe, expect, test } from "bun:test";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { exportOramaIndexSnapshot } from "@/lib/search/orama-index";

describe("exportOramaIndexSnapshot", () => {
  test("produces a static Orama snapshot for published docs", async () => {
    const registry = loadRegistry();
    const pages = loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const snapshot = await exportOramaIndexSnapshot(documents);

    expect(snapshot.version).toBe(1);
    expect(snapshot.documents.length).toBeGreaterThan(0);
    expect(snapshot.orama).toBeDefined();
    expect(snapshot.documents[0]?.url).toContain(
      "/docs/modules/grouped-query-attention",
    );
  });
});
