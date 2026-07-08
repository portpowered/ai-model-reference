/**
 * Behavioral proof for Gemma 4 architecture and release tradeoff copy on the
 * canonical model-family page.
 */
import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadModelPageFromDisk } from "./model-page-load";
import { getModelsDocsRoot } from "./content-paths";

const MODEL_SLUG = "gemma";

const CONCEPT_HREFS = [
  "/docs/concepts/mixture-of-experts",
  "/docs/glossary/context-window",
  "/docs/concepts/transformer-architecture",
  "/docs/glossary/multimodal-model",
  "/docs/glossary/autoregressive-generation",
  "/docs/concepts/tokenizers-overview",
  "/docs/systems/deployment",
  "/docs/systems/inference-engine",
] as const;

describe("gemma architecture and release tradeoffs", () => {
  test("messages explain Gemma 4 tradeoffs without obscuring the current main line", async () => {
    const loaded = await loadModelPageFromDisk(
      MODEL_SLUG,
      "en",
      getModelsDocsRoot(),
    );

    expect(loaded.messages.sections?.whatItIs.body).toContain("Gemma 4");
    expect(loaded.messages.sections?.whatItIs.body).toContain("Gemma 3");
    expect(loaded.messages.sections?.whatItIs.body).toContain("Gemma 3n");
    expect(loaded.messages.sections?.inputsAndOutputs.body).toContain(
      "256K-token context window",
    );
    expect(loaded.messages.sections?.inputsAndOutputs.body).toContain("dense");
    expect(loaded.messages.sections?.inputsAndOutputs.body).toContain(
      "mixture-of-experts",
    );
    expect(loaded.messages.sections?.architecture.body).toContain(
      "speculative decoding",
    );
    expect(loaded.messages.sections?.architecture.body).toContain(
      "per-layer embeddings",
    );
    expect(loaded.messages.sections?.practicalNotes.body).toContain(
      "Effective checkpoints",
    );
    expect(loaded.messages.sections?.practicalNotes.body).not.toMatch(
      /benchmark|leaderboard|state-of-the-art/i,
    );
  });

  test("rendered page links architecture and deployment concepts from localized copy", async () => {
    const loaded = await loadModelPageFromDisk(
      MODEL_SLUG,
      "en",
      getModelsDocsRoot(),
    );

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: loaded.messages,
        assets: loaded.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: loaded.content,
      }),
    );

    for (const href of CONCEPT_HREFS) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html).toContain("dense");
    expect(html).toContain("mixture-of-experts");
    expect(html).toContain("Gemma 3n");
    expect(html).toContain("256K");
  });
});
