import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { validatePageAssetReferences } from "@/lib/content/assets";
import { modulePageHref } from "@/lib/content/content-hrefs";
import { loadModulePage } from "@/lib/content/module-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const LOCAL_ATTENTION_URL = modulePageHref("local-attention");

describe("local-attention page contract", () => {
  test("route, registry, messages, and assets resolve together for the canonical page slice", async () => {
    const [page, indexes, pages] = await Promise.all([
      loadModulePage("local-attention"),
      loadRegistry(),
      loadPublishedDocsPages("en"),
    ]);
    const record = indexes.byId.get("module.local-attention");
    const publishedPage = pages.find(
      (entry) => entry.url === LOCAL_ATTENTION_URL,
    );
    const document = buildSearchDocuments(pages, indexes).find(
      (entry) => entry.url === LOCAL_ATTENTION_URL,
    );

    expect(record).toBeDefined();
    expect(page.frontmatter.kind).toBe("module");
    expect(page.frontmatter.registryId).toBe("module.local-attention");
    expect(page.messages.title).toBe("Local Attention");
    expect(validatePageAssetReferences(page.assets, page.messages)).toEqual([]);
    expect(publishedPage?.docsSlug).toBe("modules/local-attention");
    expect(publishedPage?.frontmatter.registryId).toBe(
      "module.local-attention",
    );
    expect(document?.title).toBe("Local Attention");
    expect(document?.aliases).toContain("local attention");
    expect(document?.relatedIds).toContain("module.sliding-window-attention");
  });

  test("rendered canonical page keeps related-doc navigation aligned with discovery", async () => {
    const [page, results] = await Promise.all([
      loadModulePage("local-attention"),
      docsSearchApi.search("local attention"),
    ]);
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(results[0]?.url.split("#")[0]).toBe(LOCAL_ATTENTION_URL);
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/docs/modules/sliding-window-attention"');
    expect(html).toContain('href="/docs/modules/sparse-attention"');
    expect(html).toContain('href="/docs/concepts/why-long-context-is-hard"');
    expect(html).toContain('href="/docs/glossary/context-window"');
  });
});
