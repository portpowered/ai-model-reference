import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadModelPage } from "@/lib/content/model-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { buildSearchDocuments } from "@/lib/search/build-documents";

describe("chapter 7 GPT-2 model page", () => {
  test("loadModelPage compiles GPT-2 with canonical model sections", async () => {
    const page = await loadModelPage("gpt-2");

    expect(page.frontmatter.kind).toBe("model");
    expect(page.frontmatter.registryId).toBe("model.gpt-2");
    expect(page.messages.title).toBe("GPT-2");
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);
    expect(page.toc.some((item) => item.url === "#architecture")).toBe(true);
    expect(page.toc.some((item) => item.url === "#training")).toBe(true);
    expect(page.toc.some((item) => item.url === "#references")).toBe(true);
  });

  test("rendered GPT-2 page links to transformer, causal attention, tokenization, and next-token prediction while showing explicit training empty states", async () => {
    const page = await loadModelPage("gpt-2");
    const html = renderToStaticMarkup(
      <ModulePageProviders messages={page.messages} assets={page.assets}>
        {page.content}
      </ModulePageProviders>,
    );

    expect(html).toContain('data-testid="model-at-a-glance"');
    expect(html).toContain('data-testid="model-module-list"');
    expect(html).toContain("/docs/glossary/transformer");
    expect(html).toContain("/docs/glossary/causal-attention");
    expect(html).toContain("/docs/glossary/token");
    expect(html).toContain("/docs/glossary/next-token-prediction");
    expect(html).toContain(
      "Structured training-regime details are not available yet.",
    );
    expect(html).toContain("Structured dataset details are not available yet.");
    expect(html).toContain("Structured paper links are not available yet.");
    expect(html).toContain('data-page-asset="architectureGraph"');
  });

  test("published docs discovery and search include GPT-2 as a model result", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const gpt2 = documents.find(
      (document) => document.url === "/docs/models/gpt-2",
    );

    expect(gpt2).toBeDefined();
    expect(gpt2?.kind).toBe("model");
    expect(gpt2?.aliases).toEqual(
      expect.arrayContaining(["GPT-2", "GPT 2", "OpenAI GPT-2"]),
    );
    expect(gpt2?.tags).toEqual(expect.arrayContaining(["foundations"]));
  });
});
