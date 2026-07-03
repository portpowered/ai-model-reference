/**
 * Retained per derived-page-validation policy: Cosmos 3 route rendering, lead
 * copy, related navigation, and architecture asset wiring cannot be expressed
 * as derived bundle invariants alone.
 */
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { source } from "@/lib/source";
import {
  getContentRoot,
  getModelsDocsRoot,
  getRegistryRoot,
} from "./content-paths";
import { loadModelPage } from "./model-page";
import { loadModelPageFromDisk } from "./model-page-load";
import { loadRegistry } from "./registry";
import { getModelById } from "./registry-runtime";
import { validateGeneratedPageBundle } from "./validate-generated-page-bundle";

const MODEL_SLUG = "cosmos-3";

describe("cosmos 3 model page", () => {
  test("published bundle is routable through Fumadocs source", () => {
    expect(source.getPage(["models", MODEL_SLUG])).toBeDefined();
  });

  test("committed bundle loads, validates, and renders message-driven content", async () => {
    const modelsDocsRoot = getModelsDocsRoot();
    const pageDir = join(modelsDocsRoot, MODEL_SLUG);
    const registryPath = join(
      getRegistryRoot(),
      "models",
      `${MODEL_SLUG}.json`,
    );
    const indexes = await loadRegistry({ registryRoot: getRegistryRoot() });

    const errors = await validateGeneratedPageBundle({
      registryRoot: getRegistryRoot(),
      docsRoot: join(getContentRoot(), "docs"),
      pageDirectory: pageDir,
      registryPath,
      pageUrl: `/docs/models/${MODEL_SLUG}`,
      indexes,
    });
    expect(errors).toEqual([]);

    const loaded = await loadModelPageFromDisk(
      MODEL_SLUG,
      "en",
      modelsDocsRoot,
    );
    expect(loaded.messages.title).toBe("Cosmos 3");
    expect(loaded.frontmatter.registryId).toBe("model.cosmos-3");
    expect(loaded.frontmatter.status).toBe("published");
    expect(loaded.messages.openingSummary).toContain("omnimodal world model");
    expect(loaded.messages.openingSummary).toContain("physical AI");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: loaded.messages,
        assets: loaded.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: loaded.content,
      }),
    );

    expect(html).toContain("Cosmos 3");
    expect(html).toContain("What It Is");
    expect(html).toContain("Architecture");
    expect(html).toContain("Practical Notes");
    expect(html).toContain("References");
    expect(html).toContain('href="/docs/glossary/world-model"');
    expect(html).toContain('href="/docs/glossary/conditioning"');
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('href="/docs/glossary/denoising-generation"');
    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain('data-graph-id="graph.cosmos-3-architecture"');
    expect(html).not.toContain("Draft placeholder");
    expect(html).not.toContain("data-missing-graph-id");
    expect(html).not.toContain("missing message");
    expect(html).not.toContain("missing asset");
  });

  test("loads a published model page with omnimodal world-model lead copy", async () => {
    const record = getModelById("model.cosmos-3");
    const page = await loadModelPage(MODEL_SLUG);

    expect(record?.status).toBe("published");
    expect(page.messages.title).toBe("Cosmos 3");
    expect(page.messages.openingSummary).toContain("autoregressive reasoning");
    expect(page.messages.openingSummary).toContain(
      "diffusion-based generation",
    );
    expect(page.messages.sections?.architecture.body).toContain("reasoner");
    expect(page.messages.sections?.architecture.body).toContain("generator");
  });
});
