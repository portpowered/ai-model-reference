import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToReadableStream, renderToStaticMarkup } from "react-dom/server";
import { CitationList } from "@/features/docs/components/CitationList";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getCitationById,
  getTrainingRegimeById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { loadTrainingRegimePage } from "@/lib/content/training-regime-page";

function loadPpoPageBundle() {
  const pageDir = getDocsPageDir("training", "ppo");
  return {
    messages: pageMessagesSchema.parse(
      JSON.parse(readFileSync(join(pageDir, "messages", "en.json"), "utf8")),
    ),
    assets: JSON.parse(readFileSync(join(pageDir, "assets.json"), "utf8")) as {
      trainingFlow: { type: string; graphId: string };
    },
  };
}

async function renderHtml(
  element: ReturnType<typeof createElement>,
): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return await new Response(stream).text();
}

describe("PPO training-regime page contracts", () => {
  test("registry record publishes PPO aliases and alignment classification", () => {
    const record = getTrainingRegimeById("training-regime.ppo");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "PPO",
      "Proximal Policy Optimization",
      "proximal policy optimization",
    ]);
    expect(record?.tags).toEqual(["alignment", "foundations"]);
    expect(record?.primaryClassificationId).toBe(
      "classification.training.alignment",
    );
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("training-regime.ppo")).toBe(true);
  });

  test("canonical PPO bundle resolves the route, registry record, English messages, asset graph, and citations together", async () => {
    const record = getTrainingRegimeById("training-regime.ppo");
    if (!record) {
      throw new Error("expected training-regime.ppo in registry");
    }

    const page = await loadTrainingRegimePage("ppo");
    const ppoPaper = getCitationById(
      "citation.proximal-policy-optimization-algorithms",
    );
    const rlhfPaper = getCitationById(
      "citation.training-language-models-to-follow-instructions-with-human-feedback",
    );

    expect(page.frontmatter.kind).toBe("training-regime");
    expect(page.frontmatter.registryId).toBe(record.id);
    expect(page.messages.title).toBe("Proximal Policy Optimization");
    expect(page.messages.openingSummary).toContain(
      "Proximal Policy Optimization, usually shortened to PPO",
    );
    expect(page.messages.sections?.whatItIs.body).toContain(
      "Proximal Policy Optimization is a reinforcement-learning training regime",
    );
    expect(page.messages.sections?.howItWorks.body).toContain("clipped");
    expect(page.messages.sections?.limitationsAndFailureModes.body).toContain(
      "operationally heavy",
    );
    expect(page.messages.sections?.limitationsAndFailureModes.body).toContain(
      "advantage estimation",
    );
    expect(page.messages.sections?.comparedToNearbyRegimes.body).toContain(
      "direct preference optimization",
    );
    expect(page.assets.trainingFlow).toMatchObject({
      type: "graph",
      graphId: "graph.ppo-training-flow",
    });
    expect(record.citationIds).toEqual([
      "citation.proximal-policy-optimization-algorithms",
      "citation.training-language-models-to-follow-instructions-with-human-feedback",
    ]);
    expect(ppoPaper?.url).toBe("https://arxiv.org/abs/1707.06347");
    expect(ppoPaper?.title).toContain(
      "Proximal Policy Optimization Algorithms",
    );
    expect(rlhfPaper?.title).toContain(
      "Training language models to follow instructions with human feedback",
    );
  });

  test("curated related docs keep the PPO page attached to the published alignment lane", () => {
    const source = getTrainingRegimeById("training-regime.ppo");
    if (!source) {
      throw new Error("expected training-regime.ppo in registry");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    const alignment = items.find(
      (item) => item.registryId === "concept.alignment",
    );
    expect(alignment?.href).toBe("/docs/concepts/alignment");
    expect(alignment?.isPlanned).toBe(false);
  });

  test("local asset config resolves the PPO graph with message-backed references", () => {
    const page = loadPpoPageBundle();
    const assets = parsePageAssetConfig(page.assets);

    expect(assets.trainingFlow.type).toBe("graph");
    if (assets.trainingFlow.type === "graph") {
      expect(assets.trainingFlow.graphId).toBe("graph.ppo-training-flow");
    }
    expect(validatePageAssetReferences(assets, page.messages)).toEqual([]);
    expect(page.messages.assets?.trainingFlow.alt).toContain("policy rollout");
    expect(page.messages.assets?.trainingFlow.caption).toContain(
      "clipped policy updates",
    );
    expect(page.messages.graph?.nodes?.rollout?.label).toBe("Policy rollout");
    expect(page.messages.graph?.nodes?.score?.label).toBe("Reward scoring");
    expect(page.messages.graph?.nodes?.update?.label).toBe(
      "Clipped PPO update",
    );
  });

  test("graph registry record teaches the clipped PPO training flow", () => {
    const graph = getGraphById("graph.ppo-training-flow");
    expect(graph?.subjectId).toBe("training-regime.ppo");
    expect(graph?.nodes.map((node) => node.id)).toEqual([
      "rollout",
      "score",
      "update",
    ]);
    expect(graph?.edges.map((edge) => edge.id)).toEqual([
      "rollout-score",
      "score-update",
    ]);
    expect(graph?.rootNodeId).toBe("rollout");
    expect(graph?.layout).toBe("vertical-expandable");
  });

  test("page renders isolation-first PPO summary, training flow graph, and clipped objective definitions", async () => {
    const page = await loadTrainingRegimePage("ppo");

    const html = await renderHtml(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("What It Is");
    expect(html).toContain(
      "Proximal Policy Optimization is a reinforcement-learning",
    );
    expect(html).toContain("clipped");
    expect(html).toContain("operationally heavy");
    expect(html).toContain('data-graph-id="graph.ppo-training-flow"');
    expect(html).toContain("Policy rollout");
    expect(html).toContain("Reward scoring");
    expect(html).toContain("Clipped PPO update");
    expect(html).toContain('role="math"');
    expect(html).toContain(
      'data-page-math-variable-definitions="ppoClipObjective"',
    );
    expect(html).toContain('data-math-variable-definition="rt"');
    expect(html).toContain("the ratio between the new policy probability");
    expect(html).toContain('data-math-variable-definition="epsilon"');
    expect(html).toContain("clip width");
    expect(html).toContain('href="/docs/training/rlhf"');
    expect(html).toContain('href="/docs/training/dpo"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("on this page");
  });

  test("renders PPO references through the shipped citation list", async () => {
    const page = await loadTrainingRegimePage("ppo");

    const referencesHtml = renderToStaticMarkup(
      createElement(
        ModulePageProviders,
        {
          messages: page.messages,
          assets: page.assets,
        },
        createElement(CitationList, {
          registryId: "training-regime.ppo",
        }),
      ),
    );

    expect(referencesHtml).toContain('data-testid="citation-list"');
    expect(referencesHtml).toContain("Proximal Policy Optimization Algorithms");
    expect(referencesHtml).toContain('href="https://arxiv.org/abs/1707.06347"');
    expect(referencesHtml).toContain(
      "Training language models to follow instructions with human feedback",
    );
  });
});
