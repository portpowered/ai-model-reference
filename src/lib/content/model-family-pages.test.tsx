import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";
import { TagPillList } from "@/features/docs/components/TagPillList";
import { loadModelPage } from "@/lib/content/model-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { buildSearchDocuments } from "@/lib/search/build-documents";

const MODEL_FAMILY_URLS = [
  "/docs/models/model-families-overview",
  "/docs/models/transformer-model-families",
  "/docs/models/diffusion-model-families",
  "/docs/models/multimodal-model-families",
  "/docs/models/omni-model-families",
  "/docs/models/world-model-families",
  "/docs/models/llama-family",
  "/docs/models/qwen-family",
  "/docs/models/deepseek-family",
] as const;

describe("chapter 7 model-family pages", () => {
  test("loadModelPage compiles the overview page with localized sections", async () => {
    const page = await loadModelPage("model-families-overview");

    expect(page.frontmatter.kind).toBe("model");
    expect(page.frontmatter.registryId).toBe("model.model-families-overview");
    expect(page.messages.title).toBe("Model Families Overview");
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);
    expect(page.messages.sections?.howFamiliesDiffer?.body).toContain(
      "Transformer",
    );
    expect(page.toc.some((item) => item.url === "#related")).toBe(true);
  });

  test("published docs discovery includes overview, structural, and frontier family pages", async () => {
    const pages = await loadPublishedDocsPages("en");
    const modelPages = pages
      .filter((page) => page.frontmatter.kind === "model")
      .map((page) => page.url)
      .sort();

    expect(modelPages).toEqual(expect.arrayContaining([...MODEL_FAMILY_URLS]));
  });

  test("search documents index model-family pages as model results with model-family tags", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    for (const url of MODEL_FAMILY_URLS) {
      const document = documents.find((entry) => entry.url === url);
      expect(document).toBeDefined();
      expect(document?.kind).toBe("model");
      expect(document?.facets.kind).toBe("model");
      expect(document?.tags).toEqual(
        expect.arrayContaining(["taxonomy", "model-family"]),
      );
    }
  });

  test("frontier family pages compile with lineage-oriented sections", async () => {
    const llama = await loadModelPage("llama-family");
    const qwen = await loadModelPage("qwen-family");
    const deepseek = await loadModelPage("deepseek-family");

    expect(llama.frontmatter.registryId).toBe("model.llama-family");
    expect(llama.messages.sections?.architectureTendencies?.body).toContain(
      "grouped-query attention",
    );
    expect(qwen.frontmatter.registryId).toBe("model.qwen-family");
    expect(qwen.messages.sections?.familyScope?.body).toContain("multimodal");
    expect(deepseek.frontmatter.registryId).toBe("model.deepseek-family");
    expect(deepseek.messages.sections?.notableBranches?.body).toContain(
      "DeepSeek-R1",
    );
  });

  test("overview and transformer family pages render registry-backed related docs", () => {
    const overviewHtml = renderToStaticMarkup(
      <RelatedDocs registryId="model.model-families-overview" />,
    );
    const transformerHtml = renderToStaticMarkup(
      <RelatedDocs registryId="model.transformer-model-families" />,
    );

    expect(overviewHtml).toContain('data-testid="curated-related-docs"');
    expect(overviewHtml).toContain("/docs/models/transformer-model-families");
    expect(overviewHtml).toContain("/docs/models/world-model-families");
    expect(transformerHtml).toContain("/docs/models/model-families-overview");
    expect(transformerHtml).toContain(
      "/docs/concepts/transformer-architecture",
    );
    expect(transformerHtml).toContain("/docs/modules/multi-head-attention");
  });

  test("model-family pages expose the model-family tag pills", () => {
    const html = renderToStaticMarkup(
      <TagPillList registryId="model.multimodal-model-families" />,
    );

    expect(html).toContain('href="/tags/model-family"');
    expect(html).toContain('href="/tags/taxonomy"');
  });

  test("frontier family related docs include both a sibling family and a representative checkpoint", () => {
    const llamaHtml = renderToStaticMarkup(
      <RelatedDocs registryId="model.llama-family" />,
    );
    const qwenHtml = renderToStaticMarkup(
      <RelatedDocs registryId="model.qwen-family" />,
    );
    const deepseekHtml = renderToStaticMarkup(
      <RelatedDocs registryId="model.deepseek-family" />,
    );

    expect(llamaHtml).toContain("/docs/models/qwen-family");
    expect(llamaHtml).toContain("/docs/models/llama-3");
    expect(qwenHtml).toContain("/docs/models/llama-family");
    expect(qwenHtml).toContain("/docs/models/qwen3");
    expect(deepseekHtml).toContain("/docs/models/qwen-family");
    expect(deepseekHtml).toContain("/docs/models/deepseek-r1");
  });
});
