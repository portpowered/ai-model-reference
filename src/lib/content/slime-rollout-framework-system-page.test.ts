import { describe, expect, test } from "bun:test";
import { createElement, type ReactElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { getSystemById } from "@/lib/content/registry-runtime";
import { loadSystemPage } from "@/lib/content/system-page";

async function renderPageHtml(element: ReactElement): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return await new Response(stream).text();
}

describe("GLM-5 slime rollout framework system page (glm-5-2-005)", () => {
  test("registry record is published with GLM-5 links and canonical aliases", () => {
    const record = getSystemById("system.slime-rollout-framework");

    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "slime",
      "slime framework",
      "slime rollout framework",
    ]);
    expect(record?.systemType).toBe("training-infrastructure");
    expect(record?.relatedIds).toEqual(
      expect.arrayContaining([
        "paper.glm-5",
        "model.glm-5",
        "training-regime.asynchronous-agent-reinforcement-learning",
        "concept.agentic-engineering",
      ]),
    );
    expect(record?.relatedModelIds).toEqual(["model.glm-5"]);
    expect(record?.paperIds).toEqual(["paper.glm-5"]);
    expect(
      PUBLISHED_DOCS_REGISTRY_IDS.has("system.slime-rollout-framework"),
    ).toBe(true);
  });

  test("page renders folded-summary content and direct links to the GLM-5 bundle", async () => {
    const page = await loadSystemPage("slime-rollout-framework");

    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("system.slime-rollout-framework");
    expect(page.messages.title).toBe("slime Rollout Framework");
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "runtime behavior",
    );
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "heartbeat-based recovery",
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
    expect(html).toContain("Where It Sits");
    expect(html).toContain("How It Works");
    expect(html).toContain("Practical Impact");
    expect(html).toContain(
      'data-graph-id="graph.slime-rollout-framework-system-flow"',
    );
    expect(html).toContain(
      'href="/docs/training/asynchronous-agent-reinforcement-learning"',
    );
    expect(html).toContain('href="/docs/papers/glm-5"');
    expect(html).toContain('href="/docs/models/glm-5"');
    expect(html).toContain('href="/docs/modules/multi-head-latent-attention"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("benchmark leaderboard");
  });
});
