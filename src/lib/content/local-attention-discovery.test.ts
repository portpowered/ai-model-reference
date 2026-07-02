import { describe, expect, test } from "bun:test";
import { modulePageHref } from "@/lib/content/content-hrefs";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const LOCAL_ATTENTION_URL = modulePageHref("local-attention");

describe("local-attention discovery", () => {
  test("published route contributes aliases, tags, and related ids to search documents", async () => {
    const pages = await loadPublishedDocsPages("en");
    const indexes = await loadRegistry();
    const documents = buildSearchDocuments(pages, indexes);
    const localAttentionDocument = documents.find(
      (document) => document.url === LOCAL_ATTENTION_URL,
    );

    expect(localAttentionDocument).toBeDefined();
    expect(localAttentionDocument?.aliases).toContain("local attention");
    expect(localAttentionDocument?.aliases).toContain("windowed attention");
    expect(localAttentionDocument?.aliases).toContain("local window attention");
    expect(localAttentionDocument?.aliases).toContain("long-context attention");
    expect(localAttentionDocument?.aliases).toContain("neighborhood attention");
    expect(localAttentionDocument?.tags).toEqual([
      "attention",
      "context-window",
    ]);
    expect(localAttentionDocument?.relatedIds).toEqual([
      "module.attention",
      "module.sliding-window-attention",
      "module.sparse-attention",
      "concept.why-long-context-is-hard",
      "concept.context-window",
    ]);
  });

  test.each([
    "local attention",
    "windowed attention",
    "local window attention",
    "neighborhood attention",
    "long-context attention",
  ] as const)("search ranks the canonical local-attention page for %s", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url.split("#")[0]).toBe(LOCAL_ATTENTION_URL);
  });

  test("attention and context-window tag surfaces list local attention in module groups", async () => {
    const messages = await loadUiMessages();
    const attentionGroups = await loadTagResourceGroups(
      "attention",
      messages,
      "en",
    );
    const contextWindowGroups = await loadTagResourceGroups(
      "context-window",
      messages,
      "en",
    );

    expect(
      attentionGroups
        .find((group) => group.kind === "module")
        ?.resources.some((resource) => resource.url === LOCAL_ATTENTION_URL),
    ).toBe(true);
    expect(
      contextWindowGroups
        .find((group) => group.kind === "module")
        ?.resources.some((resource) => resource.url === LOCAL_ATTENTION_URL),
    ).toBe(true);
  });
});
