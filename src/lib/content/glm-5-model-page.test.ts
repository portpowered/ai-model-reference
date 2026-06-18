import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadModelPage } from "@/lib/content/model-page";
import { getModelById } from "@/lib/content/registry-runtime";

describe("GLM-5 model page", () => {
  test("registry record carries model-family metadata, architecture links, and organization ownership", () => {
    const record = getModelById("model.glm-5");

    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual(["GLM-5", "GLM 5"]);
    expect(record?.tags).toEqual(
      expect.arrayContaining(["model-family", "context-window"]),
    );
    expect(record?.architectureIds).toEqual(
      expect.arrayContaining([
        "concept.transformer-architecture",
        "concept.agentic-engineering",
      ]),
    );
    expect(record?.moduleIds).toEqual(
      expect.arrayContaining([
        "module.multi-head-latent-attention",
        "module.sparse-attention",
        "module.mixture-of-experts",
      ]),
    );
    expect(record?.trainingRegimeIds).toEqual(
      expect.arrayContaining([
        "training-regime.asynchronous-agent-reinforcement-learning",
      ]),
    );
    expect(record?.paperIds).toEqual(["paper.glm-5"]);
    expect(record?.organizationId).toBe("organization.zhipu-ai");
    expect(record?.relatedIds).toEqual(
      expect.arrayContaining(["paper.glm-5", "system.slime-rollout-framework"]),
    );
  });

  test("route renders the folded summary, architecture teaching block, and linked model dependencies", async () => {
    const page = await loadModelPage("glm-5");

    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("model.glm-5");
    expect(page.messages.title).toBe("GLM-5");
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "post-training",
    );

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("Organization");
    expect(html).toContain("Zhipu AI");
    expect(html).toContain('href="https://www.z.ai"');
    expect(html).toContain("Architecture");
    expect(html).toContain('data-graph-id="graph.glm-5-architecture"');
    expect(html).toContain('href="/docs/papers/glm-5"');
    expect(html).toContain(
      'href="/docs/training/asynchronous-agent-reinforcement-learning"',
    );
    expect(html).toContain('href="/docs/systems/slime-rollout-framework"');
    expect(html).toContain('href="/docs/modules/multi-head-latent-attention"');
    expect(html).toContain('href="/docs/modules/sparse-attention"');
    expect(html).toContain('href="/docs/modules/mixture-of-experts"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).not.toContain("benchmark leaderboard");
  });
});
