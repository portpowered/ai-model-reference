import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadModelPage } from "@/lib/content/model-page";
import {
  getPublishedDocsEntryByRegistryId,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { getModelById } from "@/lib/content/registry-runtime";

describe("llama-3 model page", () => {
  test("published docs registry resolves the canonical llama-3 route", () => {
    expect(PUBLISHED_DOCS_REGISTRY_IDS).toContain("model.llama-3");

    const entry = getPublishedDocsEntryByRegistryId("model.llama-3");
    expect(entry?.url).toBe("/docs/models/llama-3");
    expect(entry?.slug).toBe("llama-3");
  });

  test("registry record matches the published page frontmatter contract", () => {
    const record = getModelById("model.llama-3");
    expect(record?.slug).toBe("llama-3");
    expect(record?.status).toBe("published");
    expect(record?.aliases).toContain("Meta Llama 3");
  });

  test("page renders core explainer sections and registry-backed metadata", async () => {
    const page = await loadModelPage("llama-3");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(page.frontmatter.registryId).toBe("model.llama-3");
    expect(page.messages.openingSummary).toContain("decoder-only transformer");
    expect(html).toContain("What It Is");
    expect(html).toContain("Inputs And Outputs");
    expect(html).toContain("Architecture");
    expect(html).toContain("Important Modules");
    expect(html).toContain("Training");
    expect(html).toContain("Practical Notes");
    expect(html).toContain("405 billion parameters");
    expect(html).toContain("128K");
    expect(html).toContain("131,072 tokens");
    expect(html).toContain("autoregressive");
    expect(html).toContain("benchmark leaderboard");
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).not.toContain('data-page-asset="architectureGraph"');
  });
});
