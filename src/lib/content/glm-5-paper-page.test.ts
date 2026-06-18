import { describe, expect, test } from "bun:test";
import { createElement, type ReactElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { loadModelPage } from "@/lib/content/model-page";
import { loadPaperPage } from "@/lib/content/paper-page";
import { getPaperById } from "@/lib/content/registry-runtime";
import { loadSystemPage } from "@/lib/content/system-page";
import { loadTrainingRegimePage } from "@/lib/content/training-regime-page";

async function renderPageHtml(element: ReactElement): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return await new Response(stream).text();
}

describe("GLM-5 paper bundle", () => {
  test("paper registry record links the canonical bundle and nearby references", () => {
    const record = getPaperById("paper.glm-5");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "GLM-5",
      "GLM-5: from Vibe Coding to Agentic Engineering",
    ]);
    expect(record?.modelIds).toEqual(["model.glm-5"]);
    expect(record?.introducesIds).toEqual([
      "model.glm-5",
      "concept.agentic-engineering",
      "training-regime.asynchronous-agent-reinforcement-learning",
      "system.slime-rollout-framework",
    ]);
    expect(record?.relatedIds).toEqual(
      expect.arrayContaining([
        "module.multi-head-latent-attention",
        "module.sparse-attention",
        "training-regime.on-policy-distillation",
      ]),
    );
  });

  test("paper route renders folded summary, introduced-record graph, and direct links to the canonical follow-on pages", async () => {
    const page = await loadPaperPage("glm-5");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("paper.glm-5");
    expect(page.messages.title).toBe(
      "GLM-5: from Vibe Coding to Agentic Engineering",
    );
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "agentic engineering",
    );

    const html = await renderPageHtml(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("What The Paper Introduced");
    expect(html).toContain('data-graph-id="graph.glm-5-contribution"');
    expect(html).toContain('href="/docs/models/glm-5"');
    expect(html).toContain('href="/docs/concepts/agentic-engineering"');
    expect(html).toContain(
      'href="/docs/training/asynchronous-agent-reinforcement-learning"',
    );
    expect(html).toContain('href="/docs/systems/slime-rollout-framework"');
    expect(html).toContain('href="/docs/modules/multi-head-latent-attention"');
    expect(html).toContain('href="/docs/modules/sparse-attention"');
    expect(html).toContain('href="/docs/training/on-policy-distillation"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("benchmark leaderboard");
  });

  test("supporting GLM-5 pages render and cross-link back into the paper bundle", async () => {
    const modelPage = await loadModelPage("glm-5");
    const modelHtml = await renderPageHtml(
      createElement(ModulePageProviders, {
        messages: modelPage.messages,
        assets: modelPage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: modelPage.content,
      }),
    );
    expect(modelHtml).toContain('href="/docs/papers/glm-5"');
    expect(modelHtml).toContain(
      'href="/docs/training/asynchronous-agent-reinforcement-learning"',
    );
    expect(modelHtml).toContain('href="/docs/systems/slime-rollout-framework"');

    const conceptPage = await loadConceptPage("agentic-engineering");
    const conceptHtml = await renderPageHtml(
      createElement(ModulePageProviders, {
        messages: conceptPage.messages,
        assets: conceptPage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: conceptPage.content,
      }),
    );
    expect(conceptHtml).toContain('href="/docs/papers/glm-5"');
    expect(conceptHtml).toContain('href="/docs/models/glm-5"');

    const trainingPage = await loadTrainingRegimePage(
      "asynchronous-agent-reinforcement-learning",
    );
    const trainingHtml = await renderPageHtml(
      createElement(ModulePageProviders, {
        messages: trainingPage.messages,
        assets: trainingPage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: trainingPage.content,
      }),
    );
    expect(trainingHtml).toContain('href="/docs/papers/glm-5"');
    expect(trainingHtml).toContain('href="/docs/models/glm-5"');
    expect(trainingHtml).toContain(
      'href="/docs/systems/slime-rollout-framework"',
    );

    const systemPage = await loadSystemPage("slime-rollout-framework");
    const systemHtml = await renderPageHtml(
      createElement(ModulePageProviders, {
        messages: systemPage.messages,
        assets: systemPage.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: systemPage.content,
      }),
    );
    expect(systemHtml).toContain('href="/docs/papers/glm-5"');
    expect(systemHtml).toContain(
      'href="/docs/training/asynchronous-agent-reinforcement-learning"',
    );
    expect(systemHtml).toContain('href="/docs/models/glm-5"');
  });
});
