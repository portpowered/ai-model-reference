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

const PARAMETER_GLOSSARY_URL = "/docs/glossary/parameter";
const ACTIVATION_GLOSSARY_URL = "/docs/glossary/activation";
const COMPUTATIONAL_GRAPH_GLOSSARY_URL = "/docs/glossary/computational-graph";

describe("Phase 2 parameter, activation, and computational graph glossary pages (US-007)", () => {
  test("registry chain links connect softmax through parameter → activation → computational graph", () => {
    const parameter = getConceptById("concept.parameter");
    const activation = getConceptById("concept.activation");
    const graph = getConceptById("concept.computational-graph");
    const softmax = getConceptById("concept.softmax");

    expect(parameter?.tags).toContain("token-to-probability-chain");
    expect(activation?.tags).toContain("token-to-probability-chain");
    expect(graph?.tags).toContain("token-to-probability-chain");

    expect(parameter?.prerequisiteIds).toContain("concept.softmax");
    expect(parameter?.relatedIds).toContain("concept.activation");
    expect(activation?.prerequisiteIds).toContain("concept.parameter");
    expect(activation?.relatedIds).toContain("concept.computational-graph");
    expect(graph?.prerequisiteIds).toContain("concept.activation");
    expect(graph?.relatedIds).toContain("concept.gradient");
    expect(softmax?.relatedIds).toContain("concept.parameter");
  });

  test("parameter page renders required sections and forward link to activation", async () => {
    const page = await loadGlossaryPage("parameter");
    expect(page.frontmatter.status).toBe("published");
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("Parameter");
    expect(html).toContain("What It Is");
    expect(html).toContain('href="/docs/glossary/activation"');
    expect(html).toContain(DERIVED_RELATED_DOC_GROUP_LABELS[CURATED_RELATED]);
  });

  test("activation page distinguishes activations from softmax and links to computational graph", async () => {
    const page = await loadGlossaryPage("activation");
    expect(page.frontmatter.status).toBe("published");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("Activation");
    expect(html).toContain("What It Is");
    expect(html).toContain("not the same as softmax");
    expect(html).toContain('href="/docs/glossary/computational-graph"');
    expect(html).toContain(DERIVED_RELATED_DOC_GROUP_LABELS[CURATED_RELATED]);
  });

  test("computational graph page renders required sections with curated forward link", async () => {
    const page = await loadGlossaryPage("computational-graph");
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
    expect(html).toContain(DERIVED_RELATED_DOC_GROUP_LABELS[CURATED_RELATED]);
  });

  test("glossary index lists parameter, activation, and computational graph with title and summary", async () => {
    const entries = await loadPublishedGlossaryEntries("en");

    const parameter = entries.find(
      (entry) => entry.url === PARAMETER_GLOSSARY_URL,
    );
    expect(parameter?.title).toBe("Parameter");
    expect(parameter?.summary.length).toBeGreaterThan(0);

    const activation = entries.find(
      (entry) => entry.url === ACTIVATION_GLOSSARY_URL,
    );
    expect(activation?.title).toBe("Activation");
    expect(activation?.summary.length).toBeGreaterThan(0);

    const graph = entries.find(
      (entry) => entry.url === COMPUTATIONAL_GRAPH_GLOSSARY_URL,
    );
    expect(graph?.title).toBe("Computational Graph");
    expect(graph?.summary.length).toBeGreaterThan(0);
  });
});
