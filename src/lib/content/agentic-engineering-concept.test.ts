import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { getConceptById } from "@/lib/content/registry-runtime";

describe("GLM-5 agentic engineering concept page (glm-5-2-003)", () => {
  test("registry record is published with GLM-5 links and canonical aliases", () => {
    const record = getConceptById("concept.agentic-engineering");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "agentic engineering",
      "coding agents",
      "software engineering agents",
    ]);
    expect(record?.conceptType).toBe("systems");
    expect(record?.relatedIds).toEqual(
      expect.arrayContaining([
        "paper.glm-5",
        "model.glm-5",
        "training-regime.asynchronous-agent-reinforcement-learning",
        "system.slime-rollout-framework",
      ]),
    );
    expect(record?.explainsIds).toEqual([
      "model.glm-5",
      "training-regime.asynchronous-agent-reinforcement-learning",
      "system.slime-rollout-framework",
    ]);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.agentic-engineering")).toBe(
      true,
    );
  });

  test("page renders folded-summary content and direct links to the GLM-5 bundle", async () => {
    const page = await loadConceptPage("agentic-engineering");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.agentic-engineering");
    expect(page.messages.title).toBe("Agentic Engineering");
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "multi-step loop",
    );
    expect(page.messages.openingSummary?.toLowerCase()).toContain(
      "long trajectory coherent enough",
    );

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
    expect(html).toContain("Simple Example");
    expect(html).toContain("Common Confusions");
    expect(html).toContain(
      'data-graph-id="graph.agentic-engineering-concept-map"',
    );
    expect(html).toContain('href="/docs/papers/glm-5"');
    expect(html).toContain('href="/docs/models/glm-5"');
    expect(html).toContain(
      'href="/docs/training/asynchronous-agent-reinforcement-learning"',
    );
    expect(html).toContain('href="/docs/systems/slime-rollout-framework"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("benchmark");
  });
});
