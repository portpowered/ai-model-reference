import { describe, expect, test } from "bun:test";
import { initAdvancedSearch } from "fumadocs-core/search/server";
import { loadShippedLocalizedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { buildSearchDocumentsForLocale } from "./build-documents";
import {
  toAdvancedSearchIndexes,
  toAdvancedSearchPageId,
} from "./to-advanced-index";

describe("toAdvancedSearchPageId", () => {
  test("keeps glm-5 and glm-5-2 sibling routes from colliding in fumadocs chunk ids", async () => {
    const indexes = await loadRegistry();
    const pages = await loadShippedLocalizedDocsPages("en");
    const documents = buildSearchDocumentsForLocale("en", indexes, pages);
    const glm5 = documents.find(
      (document) => document.registryId === "model.glm-5",
    );
    const glm52 = documents.find(
      (document) => document.registryId === "model.glm-5-2",
    );

    expect(glm5).toBeDefined();
    expect(glm52).toBeDefined();
    if (!glm5 || !glm52) {
      throw new Error("expected glm model search documents");
    }

    const glm5PageId = toAdvancedSearchPageId(glm5);
    const glm52PageId = toAdvancedSearchPageId(glm52);
    expect(glm5PageId).toBe("/docs/models/glm-5#search-page");
    expect(glm52PageId).toBe("/docs/models/glm-5-2#search-page");
    expect(`${glm5PageId}-2`).not.toBe(glm52PageId);

    const searchServer = initAdvancedSearch({
      language: "english",
      indexes: toAdvancedSearchIndexes(documents),
    });
    const glm5Results = await searchServer.search("GLM-5");
    const glm52Results = await searchServer.search("GLM-5.2");

    expect(
      glm5Results.some((result) => result.url === "/docs/models/glm-5"),
    ).toBe(true);
    expect(
      glm52Results.some((result) => result.url === "/docs/models/glm-5-2"),
    ).toBe(true);
  });
});
