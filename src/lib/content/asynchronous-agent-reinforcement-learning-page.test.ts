import { describe, expect, test } from "bun:test";
import { createElement, type ReactElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { getTrainingRegimeById } from "@/lib/content/registry-runtime";
import { loadTrainingRegimePage } from "@/lib/content/training-regime-page";

async function renderPageHtml(element: ReactElement): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return await new Response(stream).text();
}

describe("GLM-5 asynchronous agent reinforcement learning page (glm-5-2-004)", () => {
  test("registry record is published with GLM-5 links and canonical aliases", () => {
    const record = getTrainingRegimeById(
      "training-regime.asynchronous-agent-reinforcement-learning",
    );

    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "asynchronous agent reinforcement learning",
      "asynchronous agent RL",
      "asynchronous reinforcement learning for agentic tasks",
    ]);
    expect(record?.regimeType).toBe("rl");
    expect(record?.relatedIds).toEqual(
      expect.arrayContaining([
        "paper.glm-5",
        "model.glm-5",
        "system.slime-rollout-framework",
        "concept.agentic-engineering",
      ]),
    );
    expect(record?.usedByModelIds).toEqual(["model.glm-5"]);
    expect(record?.paperIds).toEqual(["paper.glm-5"]);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has(
        "training-regime.asynchronous-agent-reinforcement-learning",
      ),
    ).toBe(true);
  });

  test("page renders folded-summary content and direct links to the GLM-5 bundle", async () => {
    const page = await loadTrainingRegimePage(
      "asynchronous-agent-reinforcement-learning",
    );

    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe(
      "training-regime.asynchronous-agent-reinforcement-learning",
    );
    expect(page.messages.title).toBe(
      "Asynchronous Agent Reinforcement Learning",
    );
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "long-horizon agents",
    );
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "partially separate clocks",
    );

    const html = await renderPageHtml(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("What It Is");
    expect(html).toContain("How It Works");
    expect(html).toContain("Limitations And Failure Modes");
    expect(html).toContain(
      'data-graph-id="graph.asynchronous-agent-reinforcement-learning-training-flow"',
    );
    expect(html).toContain('href="/docs/papers/glm-5"');
    expect(html).toContain('href="/docs/models/glm-5"');
    expect(html).toContain('href="/docs/systems/slime-rollout-framework"');
    expect(html).toContain('href="/docs/training/on-policy-distillation"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("benchmark leaderboard");
  });
});
