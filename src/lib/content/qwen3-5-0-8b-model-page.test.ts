import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import qwen35Messages from "@/content/docs/models/qwen3-5-0-8b/messages/en.json";
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

const MODEL_SLUG = "qwen3-5-0-8b";
const MODEL_ID = "model.qwen3-5-0-8b";

describe("Qwen3.5-0.8B model page", () => {
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
    expect(loaded.messages.title).toBe("Qwen3.5-0.8B");
    expect(loaded.messages.openingSummary?.length).toBeGreaterThan(0);
    expect(loaded.frontmatter.registryId).toBe(MODEL_ID);
    expect(loaded.frontmatter.status).toBe("published");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: loaded.messages,
        assets: loaded.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: loaded.content,
      }),
    );

    expect(html).toContain("Qwen3.5-0.8B");
    expect(html).toContain("What It Is");
    expect(html).toContain("Inputs And Outputs");
    expect(html).toContain("Architecture");
    expect(html).toContain("Practical Notes");
    expect(html).toContain("References");
    expect(html).toContain('data-graph-id="graph.qwen3-5-0-8b-architecture"');
    expect(html).toContain(qwen35Messages.assets.architectureGraph.alt);
    expect(html).not.toContain("missing message");
    expect(html).not.toContain("missing asset");
    expect(html).not.toContain("data-missing-graph-id");
  });

  test("reader prose explains prototyping use, conservative modalities, and the Qwen3 to Qwen3.6 path", () => {
    expect(qwen35Messages.openingSummary).toContain("prototyping");
    expect(qwen35Messages.sections.practicalNotes.body).toContain(
      "task-specific fine-tuning",
    );
    expect(qwen35Messages.sections.inputsAndOutputs.body).toContain(
      "text and image",
    );
    expect(qwen35Messages.sections.whatItIs.body).toContain("Qwen3.6");
    expect(qwen35Messages.sections.whatItIs.body).toContain("Qwen3");
    expect(qwen35Messages.sections.practicalNotes.body).toContain("Qwen3.6");
  });
});
