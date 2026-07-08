/**
 * Retained per derived-page-validation policy: BERT acronym expansion, encoder-only
 * framing, masked-language-modeling teaching copy, and curated concept links cannot
 * be expressed as derived bundle invariants alone.
 */
import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadModelPage } from "@/lib/content/model-page";
import { getModelById } from "@/lib/content/registry-runtime";

const BERT_FULL_NAME =
  "Bidirectional Encoder Representations from Transformers";

describe("bert model page", () => {
  test("loads the canonical published BERT model bundle", async () => {
    const page = await loadModelPage("bert");

    expect(page.frontmatter.kind).toBe("model");
    expect(page.frontmatter.registryId).toBe("model.bert");
    expect(page.frontmatter.status).toBe("published");
  });

  test("messages expand the full BERT name before shorthand and teach encoder-only behavior", async () => {
    const page = await loadModelPage("bert");
    const record = getModelById("model.bert");
    const sections = page.messages.sections;

    expect(sections).toBeDefined();
    if (!sections) {
      return;
    }

    expect(record?.architectureIds).toEqual(
      expect.arrayContaining([
        "concept.transformer-architecture",
        "concept.encoder",
      ]),
    );
    expect(page.messages.openingSummary).toContain(`${BERT_FULL_NAME} (BERT)`);
    expect(sections.whatItIs.body).toContain(BERT_FULL_NAME);
    expect(sections.architecture.body).toContain("decoder-only models");
    expect(sections.architecture.body).toContain(
      "bidirectional self-attention",
    );
    expect(sections.inputsAndOutputs.body).toContain("WordPiece");
    expect(sections.inputsAndOutputs.body).toContain("position embedding");
    expect(sections.inputsAndOutputs.body).toContain("segment embedding");
    expect(sections.training.body).toContain("masked language modeling");
    expect(sections.practicalNotes.body).not.toContain("benchmark");
    expect(page.messages.relatedDocs).toMatchObject({
      "paper.bert-pre-training-of-deep-bidirectional-transformers": {
        reason: expect.any(String),
      },
      "concept.transformer-architecture": {
        reason: expect.any(String),
      },
      "concept.self-attention": {
        reason: expect.any(String),
      },
      "module.wordpiece": {
        reason: expect.any(String),
      },
      "training-regime.pretraining": {
        reason: expect.any(String),
      },
    });
  });

  test("renders architecture graph and curated concept links without empty placeholders", async () => {
    const page = await loadModelPage("bert");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain('data-graph-id="graph.bert-architecture"');
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/docs/concepts/self-attention"');
    expect(html).toContain('href="/docs/concepts/tokenizers-overview"');
    expect(html).toContain('href="/docs/modules/wordpiece"');
    expect(html).toContain('href="/docs/training/pretraining"');
    expect(html).toContain(
      'href="/docs/papers/bert-pre-training-of-deep-bidirectional-transformers"',
    );
    expect(html).toContain("bidirectional self-attention");
    expect(html).toContain("masked language modeling");
    expect(html).not.toContain("No modules listed yet.");
    expect(html).not.toContain("No training regimes listed yet.");
    expect(html).not.toContain("No linked paper pages listed yet.");
  });
});
