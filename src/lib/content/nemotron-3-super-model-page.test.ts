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
import { loadModelPageFromDisk } from "./model-page-load";
import { loadRegistry } from "./registry";
import { validateGeneratedPageBundle } from "./validate-generated-page-bundle";

const MODEL_SLUG = "nemotron-3-super";

describe("nemotron 3 super model page", () => {
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
    expect(loaded.messages.title).toBe("Nemotron 3 Super");
    expect(loaded.frontmatter.registryId).toBe("model.nemotron-3-super");
    expect(loaded.frontmatter.status).toBe("published");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: loaded.messages,
        assets: loaded.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: loaded.content,
      }),
    );

    expect(html).toContain("Nemotron 3 Super");
    expect(html).toContain("What It Is");
    expect(html).toContain("Architecture");
    expect(html).toContain("Practical Notes");
    expect(html).toContain("References");
    expect(html).toContain("Mixture-of-Experts");
    expect(html).toContain(
      'data-graph-id="graph.nemotron-3-super-architecture"',
    );
    expect(html).toContain(
      "Nemotron 3 Super architecture diagram showing input tokens flowing through hybrid Mamba-attention sequence blocks, sparse Mixture-of-Experts routing, and output generation.",
    );
    expect(html).not.toContain("Draft placeholder");
    expect(html).not.toContain("data-missing-graph-id");
    expect(html).not.toContain("missing message");
    expect(html).not.toContain("missing asset");
  });
});
