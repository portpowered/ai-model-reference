import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import qwen3Messages from "@/content/docs/models/qwen3-0-6b/messages/en.json";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { source } from "@/lib/source";
import {
  getContentRoot,
  getModelsDocsRoot,
  getRegistryRoot,
} from "./content-paths";
import { loadModelPageFromDisk } from "./model-page-load";
import { loadRegistry } from "./registry";
import { getModelById } from "./registry-runtime";
import { validateGeneratedPageBundle } from "./validate-generated-page-bundle";

const MODEL_SLUG = "qwen3-0-6b";
const MODEL_ID = "model.qwen3-0-6b";

describe("Qwen3-0.6B model page", () => {
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
    expect(loaded.messages.title).toBe("Qwen3-0.6B");
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

    expect(html).toContain("Qwen3-0.6B");
    expect(html).toContain("What It Is");
    expect(html).toContain("Architecture");
    expect(html).toContain("Practical Notes");
    expect(html).toContain("References");
    expect(html).toContain("smallest dense");
    expect(html).toContain("reasoning");
    expect(html).toContain("instruction-following");
    expect(html).toContain("Qwen3.6-27B");
    expect(html).toContain('data-graph-id="graph.qwen3-0-6b-architecture"');
    expect(html).toContain(
      "Qwen3-0.6B architecture diagram with token embeddings, RoPE position encoding",
    );
    expect(html).not.toContain("Draft placeholder");
    expect(html).not.toContain("data-missing-graph-id");
    expect(html).not.toContain("missing message");
    expect(html).not.toContain("missing asset");
  });

  test("reader prose frames the smallest dense Qwen3 checkpoint without benchmark-leaderboard framing", () => {
    const model = getModelById(MODEL_ID);
    const openingSummary = qwen3Messages.openingSummary.toLowerCase();
    const practicalNotes =
      qwen3Messages.sections.practicalNotes.body.toLowerCase();
    const training = qwen3Messages.sections.training.body.toLowerCase();

    expect(model?.parameterCount).toBe("0.6 billion parameters");
    expect(openingSummary).toContain("smallest dense");
    expect(practicalNotes).toContain("learning");
    expect(practicalNotes).toContain("local");
    expect(practicalNotes).toContain("efficient");
    expect(training).toContain("reasoning");
    expect(training).toContain("instruction");
    expect(training).toContain("without making benchmark ranking the point");
    expect(practicalNotes).toContain("without treating leaderboard scores");
  });

  test("registry related metadata connects to published Qwen 3.6 family pages", () => {
    const model = getModelById(MODEL_ID);
    expect(model?.relatedIds).toEqual(
      expect.arrayContaining(["model.qwen-3-6-27b", "model.qwen-3-6-35b-a3b"]),
    );
  });
});
