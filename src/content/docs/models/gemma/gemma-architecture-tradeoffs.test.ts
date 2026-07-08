import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadModelPage } from "@/lib/content/model-page";

const MODEL_SLUG = "gemma";

const ARCHITECTURE_CONCEPT_HREFS = [
  "/docs/concepts/transformer-architecture",
  "/docs/concepts/mixture-of-experts",
  "/docs/glossary/multimodal-model",
  "/docs/glossary/context-window",
  "/docs/concepts/tokenizers-overview",
  "/docs/glossary/autoregressive-generation",
  "/docs/modules/attention",
  "/docs/modules/mixture-of-experts",
] as const;

const SERVING_RELATED_HREFS = [
  "/docs/systems/inference-engine",
  "/docs/systems/deployment",
] as const;

describe("gemma architecture and release tradeoffs (gemma-model-family-page-current-main-004)", () => {
  test("messages explain inputs, architecture terms, size tradeoffs, and deployment positioning", async () => {
    const page = await loadModelPage(MODEL_SLUG);
    const { sections } = page.messages;

    expect(sections?.inputsAndOutputs.body).toContain(
      "text, images, and audio",
    );
    expect(sections?.inputsAndOutputs.body).toContain(
      "autoregressive generation",
    );
    expect(sections?.inputsAndOutputs.body).toContain("Effective 2B and 4B");
    expect(sections?.inputsAndOutputs.body).toContain(
      "26B A4B mixture of experts",
    );
    expect(sections?.inputsAndOutputs.body).toContain("31B dense");
    expect(sections?.inputsAndOutputs.body).toContain("256K");

    expect(sections?.architecture.body).toContain("transformer block");
    expect(sections?.architecture.body).toContain("multimodal architecture");
    expect(sections?.architecture.body).toContain("mixture of experts");
    expect(sections?.architecture.body).toContain("long-context attention");
    expect(sections?.architecture.body).toContain("per-layer embeddings");
    expect(sections?.architecture.body).toContain("draft-token acceptance");
    expect(sections?.architecture.body).toContain("Gemma 3");
    expect(sections?.architecture.body).toContain("Gemma 3n");
    expect(sections?.architecture.body).toContain(
      "do not replace Gemma 4 as the architectural reference point",
    );

    expect(sections?.practicalNotes.body).toContain("on-device feasibility");
    expect(sections?.practicalNotes.body).toContain("12B dense checkpoint");
    expect(sections?.practicalNotes.body).toContain("31B dense variant");
    expect(sections?.practicalNotes.body).toContain("inference-engine");
    expect(sections?.practicalNotes.body).toContain("deployment");
    expect(sections?.practicalNotes.body).not.toMatch(
      /leaderboard|state-of-the-art|benchmark ranking/i,
    );
  });

  test("rendered page auto-links architecture concepts and surfaces serving-related docs", async () => {
    const page = await loadModelPage(MODEL_SLUG);
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    for (const href of ARCHITECTURE_CONCEPT_HREFS) {
      expect(html).toContain(`href="${href}"`);
    }

    for (const href of SERVING_RELATED_HREFS) {
      expect(html).toContain(`href="${href}"`);
    }

    expect(html).toContain("256K");
    expect(html).toContain("Effective 2B and 4B");
    expect(html).toContain("mixture of experts");
    expect(html).toContain("per-layer");
    expect(html).toContain('href="/docs/concepts/embedding"');
    expect(html).not.toContain("Draft placeholder");
    expect(html).not.toContain("missing message");
  });
});
