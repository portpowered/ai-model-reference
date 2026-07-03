import { describe, expect, setDefaultTimeout, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getCitationById,
  getConceptById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "concept.flow-matching";
const CONCEPT_URL = "/docs/concepts/flow-matching";
const VECTOR_FIELD_GRAPH_ID = "graph.flow-matching-vector-field-flow";
const pageDir = getDocsPageDir("concepts", "flow-matching");
const messagesPath = join(pageDir, "messages/en.json");

setDefaultTimeout(15_000);

const EXPECTED_RELATED_IDS = [
  "training-regime.diffusion-training-objective",
  "paper.latent-diffusion",
  "module.diffusion-transformer-block",
  "model.ltx-23",
] as const;

describe("flow matching concept discovery (flow-matching-concept-page-001)", () => {
  test("registry record stays published with flow-matching aliases, objective tags, and focused related ids", () => {
    const record = getConceptById(REGISTRY_ID);
    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(record?.slug).toBe("flow-matching");
    expect(record?.aliases).toEqual([
      "Flow matching",
      "flow matching",
      "rectified flow",
      "velocity prediction",
      "flow-matching objective",
    ]);
    expect(record?.tags).toEqual(["foundations", "model-family"]);
    expect(record?.conceptType).toBe("training");
    expect(record?.primaryClassificationId).toBe(
      "classification.concept.training",
    );
    expect(record?.prerequisiteIds).toEqual([
      "concept.generative-model",
      "concept.denoising-generation",
      "training-regime.diffusion-training-objective",
    ]);
    expect(record?.relatedIds).toEqual([...EXPECTED_RELATED_IDS]);
    expect(record?.citationIds).toEqual([
      "citation.flow-matching-for-generative-modeling",
      "citation.rectified-flow",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
  });

  test("citation records resolve for flow matching objective claims", () => {
    const flowMatchingPaper = getCitationById(
      "citation.flow-matching-for-generative-modeling",
    );
    expect(flowMatchingPaper?.status).toBe("published");
    expect(flowMatchingPaper?.title).toBe(
      "Flow Matching for Generative Modeling",
    );

    const rectifiedFlowPaper = getCitationById("citation.rectified-flow");
    expect(rectifiedFlowPaper?.status).toBe("published");
    expect(rectifiedFlowPaper?.aliases).toEqual(
      expect.arrayContaining(["Rectified Flow", "rectified flow paper"]),
    );
  });

  test("curated related links resolve only to existing adjacent diffusion and video targets", () => {
    const source = getConceptById(REGISTRY_ID);
    if (!source) {
      throw new Error("expected concept.flow-matching in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find(
        (item) =>
          item.registryId === "training-regime.diffusion-training-objective",
      )?.href,
    ).toBe("/docs/training/diffusion-training-objective");
    expect(
      items.find((item) => item.registryId === "paper.latent-diffusion")?.href,
    ).toBe("/docs/papers/latent-diffusion");
    expect(
      items.find(
        (item) => item.registryId === "module.diffusion-transformer-block",
      )?.href,
    ).toBe("/docs/modules/diffusion-transformer-block");
    expect(items.find((item) => item.registryId === "model.ltx-23")?.href).toBe(
      "/docs/models/ltx-23",
    );
    expect(items.some((item) => item.registryId.includes("cosmos"))).toBe(
      false,
    );
    expect(
      items.some((item) => item.registryId.includes("video-generation")),
    ).toBe(false);
  });
});

describe("flow matching concept page (flow-matching-concept-page-002)", () => {
  test("messages define flow matching as movement from simple or noisy states toward data", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Flow matching");
    expect(messages.openingSummary?.toLowerCase()).toContain("simple");
    expect(messages.openingSummary?.toLowerCase()).toContain("noisy");
    expect(messages.openingSummary?.toLowerCase()).toContain("toward");
    expect(messages.openingSummary?.toLowerCase()).toContain("data");
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "generative training objective",
    );
    expect(messages.sections?.whatItIs.body?.toLowerCase()).toContain(
      "starting point",
    );
    expect(messages.sections?.whyItMatters.body?.toLowerCase()).toContain(
      "image",
    );
    expect(messages.sections?.simpleExample.body?.toLowerCase()).toContain(
      "noise",
    );
    expect(messages.sections?.commonConfusions.body?.toLowerCase()).toContain(
      "diffusion",
    );
  });

  test("page renders title, opening summary, sections, tags, related docs, and references", async () => {
    const page = await loadConceptPage("flow-matching");

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.messages.openingSummary?.length).toBeGreaterThan(0);

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("What It Is");
    expect(html).toContain("Why It Matters");
    expect(html).toContain("generative training objective");
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('href="/tags/model-family"');
    expect(html).toContain(
      'href="/docs/training/diffusion-training-objective"',
    );
    expect(html).toContain('href="/docs/papers/latent-diffusion"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search index and live search route flow matching aliases to the concept page", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find((entry) => entry.url === CONCEPT_URL);

    expect(document?.kind).toBe("concept");
    expect(document?.registryId).toBe(REGISTRY_ID);
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "flow matching",
        "rectified flow",
        "velocity prediction",
      ]),
    );

    for (const query of [
      "flow matching",
      "rectified flow",
      "velocity prediction",
    ] as const) {
      const results = await docsSearchApi.search(query);
      expect(results.some((result) => result.url === CONCEPT_URL)).toBe(true);
    }
  });

  test("page bundle resolves from getDocsPageDir", async () => {
    const pages = await loadPublishedDocsPages("en");
    const page = pages.find((entry) => entry.pageDir === pageDir);

    expect(page?.url).toBe(CONCEPT_URL);
    expect(page?.frontmatter.registryId).toBe(REGISTRY_ID);
  });
});

describe("flow matching vector field intuition (flow-matching-concept-page-003)", () => {
  test("messages teach vector fields as direction-and-speed rules with training pairs before math", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    const body = messages.sections?.vectorFieldIntuition.body ?? "";
    expect(body.toLowerCase()).toContain("vector field");
    expect(body.toLowerCase()).toContain("direction");
    expect(body.toLowerCase()).toContain("speed");
    expect(body.toLowerCase()).toContain("current");
    expect(body.toLowerCase()).toContain("time");
    expect(body.toLowerCase()).toContain("velocity");
    expect(body.toLowerCase()).toContain("target");
    expect(
      messages.math?.velocityMatchingObjective?.variableDefinitions?.vtheta
        ?.definition,
    ).toContain("velocity");
    expect(
      messages.assets?.vectorFieldFlow?.legend?.["data-flow"]?.label,
    ).toBeTruthy();
  });

  test("page renders vector field section, training flow graph, and velocity objective math", async () => {
    const page = await loadConceptPage("flow-matching");
    const vectorFieldAsset = page.assets.vectorFieldFlow;
    expect(vectorFieldAsset?.type).toBe("graph");
    if (vectorFieldAsset?.type === "graph") {
      expect(vectorFieldAsset.graphId).toBe(VECTOR_FIELD_GRAPH_ID);
    }

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("Vector Field Intuition");
    expect(html).toContain("direction-and-speed");
    expect(html).toContain("data-page-math-variable-definitions");
    expect(html).toContain('data-math-variable-definition="vtheta"');
    expect(html).toContain('data-math-variable-definition="targetvelocity"');
    expect(html).toContain("katex");
    expect(html).toContain(`data-graph-id="${VECTOR_FIELD_GRAPH_ID}"`);
    expect(html).toContain("Training pairs current states");
  });
});
