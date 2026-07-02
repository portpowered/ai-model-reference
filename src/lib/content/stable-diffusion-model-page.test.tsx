import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { MODELS_DOCS_ROOT } from "@/lib/content/content-paths";
import { loadModelPage } from "@/lib/content/model-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import { getModelById } from "@/lib/content/registry-runtime";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const STABLE_DIFFUSION_SLUG = "stable-diffusion" as const;

function renderModelHtml() {
  return loadModelPage(STABLE_DIFFUSION_SLUG).then((page) =>
    renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    ),
  );
}

describe("stable-diffusion model page (stable-diffusion-model-page-002)", () => {
  test("messages include required model template keys and openingSummary", () => {
    const messagesPath = join(
      MODELS_DOCS_ROOT,
      STABLE_DIFFUSION_SLUG,
      "messages/en.json",
    );
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Stable Diffusion");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.inputsAndOutputs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.architecture.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.training.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.practicalNotes.body?.length).toBeGreaterThan(0);
    expect(messages.description).not.toMatch(/phase|factory|coming later/i);
  });

  test("published model page compiles with localized sections, tags, and related docs", async () => {
    const page = await loadModelPage(STABLE_DIFFUSION_SLUG);

    expect(page.frontmatter.kind).toBe("model");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("model.stable-diffusion");

    const html = await renderModelHtml();

    expect(html).toContain("Stable Diffusion");
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("Draft placeholder");
  });

  test("page renders architecture graph from registry-backed asset reference", async () => {
    const html = await renderModelHtml();

    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain(
      'data-graph-id="graph.stable-diffusion-architecture"',
    );
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain("Text");
    expect(html).toContain("Denoiser");
  });

  test("architecture graph teaches prompt conditioning, latent denoising, and decoding (stable-diffusion-model-page-003)", async () => {
    const html = await renderModelHtml();

    expect(html).toContain('data-graph-node-id="text-prompt"');
    expect(html).toContain('data-graph-node-id="text-encoder"');
    expect(html).toContain('data-graph-node-id="noisy-latent"');
    expect(html).toContain('data-graph-node-id="latent-denoiser"');
    expect(html).toContain('data-graph-node-id="vae-decoder"');
    expect(html).toContain('data-graph-node-id="generated-image"');
    expect(html).toContain('data-graph-node-id="denoise-repeat-marker"');
    expect(html).toContain('data-graph-node-id="latent-pipeline"');
    expect(html).toContain('data-graph-interaction-pan="true"');
    expect(html).toContain('data-graph-interaction-zoom="true"');
    expect(html).toContain("Noisy");
    expect(html).toContain("T×");
    expect(html).toContain(
      "Text conditioning steers repeated latent denoising before the decoder maps the final latent into pixels.",
    );
  });

  test("related docs surface shipped adjacent glossary targets", async () => {
    const html = await renderModelHtml();

    expect(html).toContain('href="/docs/glossary/diffusion-model"');
    expect(html).toContain('href="/docs/glossary/denoising-generation"');
    expect(html).toContain('href="/docs/glossary/latent-space"');
    expect(html).toContain('href="/docs/glossary/latent"');
    expect(html).toContain('href="/docs/glossary/conditioning"');
    expect(html).toContain('href="/docs/glossary/loss-function"');
  });

  test("registry and published docs manifest include stable-diffusion", () => {
    const model = getModelById("model.stable-diffusion");
    expect(model?.slug).toBe(STABLE_DIFFUSION_SLUG);
    expect(PUBLISHED_DOCS_REGISTRY_IDS).toContain("model.stable-diffusion");
  });

  test("search indexes stable diffusion aliases", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const stableDiffusionDoc = documents.find(
      (doc) => doc.url === "/docs/models/stable-diffusion",
    );

    expect(stableDiffusionDoc).toBeDefined();
    expect(stableDiffusionDoc?.title).toBe("Stable Diffusion");

    const searchResults = await docsSearchApi.search("stable diffusion");
    expect(
      searchResults.some(
        (result) => result.url === "/docs/models/stable-diffusion",
      ),
    ).toBe(true);
  });
});
