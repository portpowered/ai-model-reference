import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadPublishedGlossaryEntries } from "@/lib/content/glossary";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { expectGlossaryBodyOmitsTitleHeading } from "@/lib/content/glossary-test-helpers";
import { getConceptById } from "@/lib/content/registry-runtime";
import {
  CURATED_RELATED,
  DERIVED_RELATED_DOC_GROUP_LABELS,
} from "@/lib/content/related-docs";

const LOSS_FUNCTION_GLOSSARY_URL = "/docs/glossary/loss-function";
const OPTIMIZER_STATE_GLOSSARY_URL = "/docs/glossary/optimizer-state";
const BACKPROPAGATION_GLOSSARY_URL = "/docs/glossary/backpropagation";
const PARAMETER_GLOSSARY_URL = "/docs/glossary/parameter";

describe("Phase 2 loss function and optimizer state glossary pages (US-009)", () => {
  test("registry links connect loss function and optimizer state to the training chain", () => {
    const gradient = getConceptById("concept.gradient");
    const backprop = getConceptById("concept.backpropagation");
    const lossFunction = getConceptById("concept.loss-function");
    const optimizerState = getConceptById("concept.optimizer-state");
    const parameter = getConceptById("concept.parameter");

    expect(backprop?.relatedIds).toContain("concept.loss-function");
    expect(lossFunction?.prerequisiteIds).toContain("concept.backpropagation");
    expect(gradient?.relatedIds).toContain("concept.backpropagation");
    expect(lossFunction?.relatedIds).toContain("concept.optimizer-state");
    expect(optimizerState?.prerequisiteIds).toContain("concept.loss-function");
    expect(optimizerState?.relatedIds).toContain("concept.parameter");
    expect(parameter?.tags).toContain("token-to-probability-chain");
  });

  test("loss function and optimizer state registry records include training citations", () => {
    const lossFunction = getConceptById("concept.loss-function");
    const optimizerState = getConceptById("concept.optimizer-state");

    expect(lossFunction?.citationIds).toContain(
      "citation.goodfellow-deep-learning",
    );
    expect(optimizerState?.citationIds).toContain("citation.kingma-adam");
  });

  test("backpropagation page links forward to loss function", async () => {
    const page = await loadGlossaryPage("backpropagation");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('href="/docs/glossary/loss-function"');
    expect(html).toContain(DERIVED_RELATED_DOC_GROUP_LABELS[CURATED_RELATED]);
  });

  test("loss function page renders published sections with citations and link to optimizer state", async () => {
    const page = await loadGlossaryPage("loss-function");
    expect(page.frontmatter.status).toBe("published");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expect(html).toContain("What It Is");
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain("Goodfellow, Ian");
    expect(html).toContain('href="/docs/glossary/optimizer-state"');
  });

  test("optimizer state page renders citations and link to parameter", async () => {
    const page = await loadGlossaryPage("optimizer-state");
    expect(page.frontmatter.status).toBe("published");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expect(html).toContain("What It Is");
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain("Kingma, Diederik P.");
    expect(html).toContain('href="/docs/glossary/parameter"');
  });

  test("glossary index lists loss function and optimizer state with title and summary", async () => {
    const entries = await loadPublishedGlossaryEntries("en");

    const lossFunction = entries.find(
      (entry) => entry.url === LOSS_FUNCTION_GLOSSARY_URL,
    );
    expect(lossFunction?.title).toBe("Loss Function");
    expect(lossFunction?.summary.length).toBeGreaterThan(0);

    const optimizerState = entries.find(
      (entry) => entry.url === OPTIMIZER_STATE_GLOSSARY_URL,
    );
    expect(optimizerState?.title).toBe("Optimizer State");
    expect(optimizerState?.summary.length).toBeGreaterThan(0);

    const backprop = entries.find(
      (entry) => entry.url === BACKPROPAGATION_GLOSSARY_URL,
    );
    expect(backprop?.title).toBe("Backpropagation");

    const parameter = entries.find(
      (entry) => entry.url === PARAMETER_GLOSSARY_URL,
    );
    expect(parameter?.title).toBe("Parameter");
  });
});
