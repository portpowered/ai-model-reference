import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getCitationById,
  getPrimaryClassificationForRecord,
  getTrainingRegimeById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { loadTrainingRegimePage } from "@/lib/content/training-regime-page";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

async function renderHtml(
  element: ReturnType<typeof createElement>,
): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return await new Response(stream).text();
}

const REGISTRY_ID = "training-regime.rlhf";
const PAGE_URL = "/docs/training/rlhf";
const GRAPH_ID = "graph.rlhf-training-flow";
const INSTRUCTGPT_CITATION_ID =
  "citation.training-language-models-to-follow-instructions-with-human-feedback";

function pageBaseUrl(url: string): string {
  return url.split("#")[0] ?? url;
}

describe("RLHF training-regime discovery contracts (rlhf-page-001)", () => {
  test("registry record publishes RLHF aliases, alignment classification, InstructGPT citation, and adjacent related ids", () => {
    const record = getTrainingRegimeById(REGISTRY_ID);
    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("rlhf");
    expect(record?.aliases).toEqual([
      "RLHF",
      "reinforcement learning from human feedback",
      "human feedback reinforcement learning",
      "preference reinforcement learning",
    ]);
    expect(record?.tags).toEqual(["alignment", "foundations"]);
    expect(record?.primaryClassificationId).toBe(
      "classification.training.alignment",
    );
    expect(getPrimaryClassificationForRecord(REGISTRY_ID)?.id).toBe(
      "classification.training.alignment",
    );
    expect(record?.relatedIds).toEqual([
      "concept.alignment",
      "training-regime.instruction-tuning",
      "training-regime.dpo",
      "training-regime.post-training",
    ]);
    expect(record?.citationIds).toEqual([INSTRUCTGPT_CITATION_ID]);
    expect(getCitationById(INSTRUCTGPT_CITATION_ID)?.url).toBe(
      "https://arxiv.org/abs/2203.02155",
    );
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
  });

  test("curated related docs keep RLHF attached to alignment and nearby training-regime pages", () => {
    const source = getTrainingRegimeById(REGISTRY_ID);
    if (!source) {
      throw new Error("expected training-regime.rlhf in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "concept.alignment")?.href,
    ).toBe("/docs/concepts/alignment");
    expect(
      items.find(
        (item) => item.registryId === "training-regime.instruction-tuning",
      )?.href,
    ).toBe("/docs/training/instruction-tuning");
    expect(
      items.find((item) => item.registryId === "training-regime.dpo")?.href,
    ).toBe("/docs/training/dpo");
    expect(
      items.find((item) => item.registryId === "training-regime.post-training")
        ?.href,
    ).toBe("/docs/training/post-training");
  });

  test("canonical RLHF bundle resolves the route, registry record, English messages, asset graph, and citation together", async () => {
    const record = getTrainingRegimeById(REGISTRY_ID);
    if (!record) {
      throw new Error("expected training-regime.rlhf in registry");
    }

    const page = await loadTrainingRegimePage("rlhf");
    const citation = getCitationById(INSTRUCTGPT_CITATION_ID);

    expect(page.frontmatter.kind).toBe("training-regime");
    expect(page.frontmatter.registryId).toBe(record.id);
    expect(page.messages.title).toBe(
      "Reinforcement Learning from Human Feedback",
    );
    expect(page.messages.description).toContain("human preference signals");
    expect(page.messages.openingSummary).toContain("usually shortened to RLHF");
    expect(page.messages.openingSummary).toContain(
      "post-training workflow that steers model behavior using human preference signals",
    );
    expect(page.messages.sections?.whatItIs.body).toContain(
      "train a reward model that predicts those preferences",
    );
    expect(page.messages.sections?.howItWorks.body).toContain(
      "Proximal Policy Optimization or PPO",
    );
    expect(page.assets.trainingFlow).toMatchObject({
      type: "graph",
      graphId: GRAPH_ID,
    });
    expect(record.defaultTitleKey).toBe("title");
    expect(record.defaultSummaryKey).toBe("description");
    expect(record.citationIds).toEqual([INSTRUCTGPT_CITATION_ID]);
    expect(citation?.url).toBe("https://arxiv.org/abs/2203.02155");
    expect(citation?.title).toContain(
      "Training language models to follow instructions",
    );
  });

  test("page renders title, summary, workflow visual, related links, tags, and references without reader-shortcut copy", async () => {
    const page = await loadTrainingRegimePage("rlhf");

    expect(page.frontmatter.kind).toBe("training-regime");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);

    const html = await renderHtml(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("Reinforcement Learning from Human Feedback");
    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain(`data-graph-title="${GRAPH_ID}"`);
    expect(html).toContain(`data-graph-legend="${GRAPH_ID}"`);
    expect(html).toContain("RLHF feedback-and-optimization loop");
    expect(html).toContain("Human preference");
    expect(html).toContain("Reward model");
    expect(html).toContain("Policy optimization");
    expect(html).toContain("Aligned model");
    expect(html).toContain("https://arxiv.org/abs/2203.02155");
    expect(html).toContain('href="/docs/training/instruction-tuning"');
    expect(html).toContain('href="/docs/training/dpo"');
    expect(html).toContain('href="/docs/training/post-training"');
    expect(html).toContain('href="/search?q=PPO"');
    expect(html).toContain('href="/search?q=GRPO"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).not.toContain("Reader Shortcut");
  });

  test("search documents and runtime search resolve RLHF aliases to the canonical training-regime page", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find((entry) => entry.url === PAGE_URL);
    expect(document?.kind).toBe("training-regime");
    expect(document?.registryId).toBe(REGISTRY_ID);
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "RLHF",
        "reinforcement learning from human feedback",
      ]),
    );
    expect(document?.relatedIds).toEqual([
      "concept.alignment",
      "training-regime.instruction-tuning",
      "training-regime.dpo",
      "training-regime.post-training",
    ]);
    expect(document?.tags).toEqual(
      expect.arrayContaining(["alignment", "foundations"]),
    );

    for (const query of [
      "RLHF",
      "reinforcement learning from human feedback",
    ]) {
      const results = await docsSearchApi.search(query);
      expect(
        results.some((result) => pageBaseUrl(result.url) === PAGE_URL),
      ).toBe(true);
    }
  });
});

describe("RLHF workflow and tradeoffs (rlhf-page-003)", () => {
  test("workflow graph exposes the full feedback-and-optimization sequence", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph?.subjectId).toBe(REGISTRY_ID);
    expect(graph?.nodes.map((node) => node.id)).toEqual([
      "baseModel",
      "humanPreferences",
      "rewardModel",
      "policyOptimization",
      "alignedModel",
    ]);
    expect(graph?.edges.map((edge) => edge.id)).toEqual([
      "base-model-human-preferences",
      "human-preferences-reward-model",
      "reward-model-policy-optimization",
      "policy-optimization-aligned-model",
    ]);
  });

  test("how-it-works narrative and limitations cover RLHF tradeoffs and nearby regimes", async () => {
    const page = await loadTrainingRegimePage("rlhf");

    expect(page.messages.sections?.whyItExists.body).toContain(
      "instruction following",
    );
    expect(page.messages.sections?.whyItExists.body).toContain(
      "preference alignment",
    );
    expect(page.messages.sections?.whyItExists.body).toContain(
      "safety-policy shaping",
    );
    expect(page.messages.sections?.howItWorks.body).toContain(
      "reward model learns to predict those human judgments",
    );
    expect(page.messages.sections?.howItWorks.body).toContain(
      "aligned model behavior",
    );
    expect(page.messages.sections?.comparedToNearbyRegimes.body).toContain(
      "Supervised fine-tuning",
    );
    expect(page.messages.sections?.comparedToNearbyRegimes.body).toContain(
      "Direct Preference Optimization",
    );
    expect(page.messages.sections?.comparedToNearbyRegimes.body).toContain(
      "Group Relative Policy Optimization",
    );
    expect(page.messages.sections?.limitationsAndFailureModes.body).toContain(
      "costly human data collection",
    );
    expect(page.messages.sections?.limitationsAndFailureModes.body).toContain(
      "reward model can mismatch",
    );
    expect(page.messages.sections?.limitationsAndFailureModes.body).toContain(
      "reward hacking",
    );
    expect(page.messages.sections?.limitationsAndFailureModes.body).toContain(
      "Optimization can become unstable",
    );
    expect(page.messages.sections?.limitationsAndFailureModes.body).toContain(
      "overly narrow",
    );
    expect(
      page.messages.assets?.trainingFlow?.legend?.["data-flow"]?.label,
    ).toBe("Preference and policy flow");
    expect(page.messages.graph?.nodes?.humanPreferences?.label).toContain(
      "Human preference",
    );
    expect(page.messages.graph?.nodes?.policyOptimization?.label).toContain(
      "Policy optimization",
    );
  });
});
