import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CitationList } from "@/features/docs/components/CitationList";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { PageMathFormula } from "@/features/docs/components/PageMathFormula";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getTrainingRegimeById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";

describe("ppo training regime page", () => {
  test("is published and routes related alignment surfaces where shipped", () => {
    const record = getTrainingRegimeById("training-regime.ppo");

    expect(record?.status).toBe("published");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("training-regime.ppo")).toBe(true);

    if (!record) {
      throw new Error("expected training-regime.ppo in registry");
    }

    const items = deriveCuratedRelatedItems(
      record,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const alignment = items.find(
      (item) => item.registryId === "concept.alignment",
    );
    expect(alignment?.href).toBe("/docs/glossary/alignment");
    expect(alignment?.isPlanned).toBe(false);
  });

  test("loads the shipped PPO page bundle with message-driven PPO copy", async () => {
    const page = await loadLocalDocsPage({
      section: "training",
      slug: "ppo",
    });

    expect(page.frontmatter.kind).toBe("training-regime");
    expect(page.frontmatter.registryId).toBe("training-regime.ppo");
    expect(page.messages.title).toBe("Proximal Policy Optimization");
    expect(page.messages.openingSummary?.toLowerCase()).toContain("rlhf");
    expect(page.messages.sections?.howItWorks?.body).toContain("clipped");
    expect(page.messages.sections?.limitationsAndFailureModes?.body).toContain(
      "operationally heavy",
    );
    expect(page.messages.sections?.comparedToNearbyRegimes?.body).toContain(
      "direct preference optimization",
    );
    expect(page.assets.trainingFlow.type).toBe("graph");
    if (page.assets.trainingFlow.type !== "graph") {
      throw new Error("expected PPO trainingFlow asset to resolve to a graph");
    }
    expect(page.assets.trainingFlow.graphId).toBe("graph.ppo-training-flow");
    expect(page.toc.some((item) => item.url === "#how-it-works")).toBe(true);
    expect(page.messages.math?.ppoClipObjective?.variableDefinitions?.rt?.term).toBe(
      "r_t(\\theta)",
    );
    expect(
      page.messages.math?.ppoClipObjective?.variableDefinitions?.epsilon
        ?.definition,
    ).toContain("clip width");
  });

  test("renders PPO references and math definitions through the shipped page components", async () => {
    const page = await loadLocalDocsPage({
      section: "training",
      slug: "ppo",
    });

    const referencesHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        children: createElement(CitationList, {
          registryId: "training-regime.ppo",
        }),
      }),
    );
    const mathHtml = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        children: createElement(PageMathFormula, {
          mathId: "ppoClipObjective",
        }),
      }),
    );

    expect(referencesHtml).toContain('data-testid="citation-list"');
    expect(referencesHtml).toContain("Proximal Policy Optimization Algorithms");
    expect(referencesHtml).toContain('href="https://arxiv.org/abs/1707.06347"');
    expect(referencesHtml).toContain(
      "Training language models to follow instructions with human feedback",
    );
    expect(mathHtml).toContain(
      'data-page-math-variable-definitions="ppoClipObjective"',
    );
    expect(mathHtml).toContain('data-math-variable-definition="rt"');
    expect(mathHtml).toContain("the ratio between the new policy probability");
  });

  test("derived related docs render the shipped alignment link for PPO", () => {
    const html = renderToStaticMarkup(
      createElement(DerivedRelatedDocs, {
        registryId: "training-regime.ppo",
        groups: [
          "same-model-family",
          "shared-modules",
          "shared-training-regimes",
          "shared-tags",
          "curated-related",
        ],
      }),
    );

    expect(html).toContain('href="/docs/glossary/alignment"');
    expect(html).toContain("Alignment");
  });

  test("alignment routes readers back to the canonical PPO page", () => {
    const html = renderToStaticMarkup(
      createElement(DerivedRelatedDocs, {
        registryId: "concept.alignment",
        groups: ["curated-related"],
      }),
    );

    expect(html).toContain('href="/docs/training/ppo"');
    expect(html).toContain(">PPO<");
  });
});
