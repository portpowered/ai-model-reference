import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadPublishedGlossaryEntries } from "@/lib/content/glossary";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { getConceptById } from "@/lib/content/registry-runtime";
import {
  CURATED_RELATED,
  DERIVED_RELATED_DOC_GROUP_LABELS,
} from "@/lib/content/related-docs";

const GRADIENT_GLOSSARY_URL = "/docs/glossary/gradient";
const BACKPROPAGATION_GLOSSARY_URL = "/docs/glossary/backpropagation";
const COMPUTATIONAL_GRAPH_GLOSSARY_URL = "/docs/glossary/computational-graph";

describe("Phase 2 gradient and backpropagation glossary pages (US-008)", () => {
  test("registry links connect gradient and backpropagation to the training chain", () => {
    const graph = getConceptById("concept.computational-graph");
    const gradient = getConceptById("concept.gradient");
    const backprop = getConceptById("concept.backpropagation");
    const lossFunction = getConceptById("concept.loss-function");

    expect(graph?.relatedIds).toContain("concept.gradient");
    expect(gradient?.prerequisiteIds).toContain("concept.computational-graph");
    expect(gradient?.relatedIds).toContain("concept.backpropagation");
    expect(backprop?.prerequisiteIds).toContain("concept.gradient");
    expect(backprop?.relatedIds).toContain("concept.loss-function");
    expect(lossFunction?.prerequisiteIds).toContain("concept.backpropagation");
  });

  test("computational graph page links forward to gradient", async () => {
    const page = await loadGlossaryPage("computational-graph");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('href="/docs/glossary/gradient"');
    expect(html).toContain(DERIVED_RELATED_DOC_GROUP_LABELS[CURATED_RELATED]);
  });

  test("gradient page renders published sections with math and link to backpropagation", async () => {
    const page = await loadGlossaryPage("gradient");
    expect(page.frontmatter.status).toBe("published");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("Gradient");
    expect(html).toContain("What It Is");
    expect(html).toContain('class="katex"');
    expect(html).toContain('href="/docs/glossary/backpropagation"');
  });

  test("backpropagation page renders math and fenced code examples", async () => {
    const page = await loadGlossaryPage("backpropagation");
    expect(page.frontmatter.status).toBe("published");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("Backpropagation");
    expect(html).toContain("What It Is");
    expect(html).toContain('class="katex"');
    expect(html).toMatch(/<figure|<pre/);
    expect(html).toContain("loss.backward()");
  });

  test("glossary index lists gradient and backpropagation with title and summary", async () => {
    const entries = await loadPublishedGlossaryEntries("en");

    const gradient = entries.find(
      (entry) => entry.url === GRADIENT_GLOSSARY_URL,
    );
    expect(gradient?.title).toBe("Gradient");
    expect(gradient?.summary.length).toBeGreaterThan(0);

    const backprop = entries.find(
      (entry) => entry.url === BACKPROPAGATION_GLOSSARY_URL,
    );
    expect(backprop?.title).toBe("Backpropagation");
    expect(backprop?.summary.length).toBeGreaterThan(0);

    const graph = entries.find(
      (entry) => entry.url === COMPUTATIONAL_GRAPH_GLOSSARY_URL,
    );
    expect(graph?.title).toBe("Computational Graph");
  });
});
