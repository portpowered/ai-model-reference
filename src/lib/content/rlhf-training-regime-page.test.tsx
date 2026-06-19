import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { TRAINING_DOCS_ROOT } from "@/lib/content/content-paths";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import { listRelatedRegistryRecords } from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";
import { loadTrainingRegimePage } from "./training-regime-page";

const pageDir = join(TRAINING_DOCS_ROOT, "rlhf");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

async function renderPageHtml(
  page: Awaited<ReturnType<typeof loadTrainingRegimePage>>,
) {
  const stream = await renderToReadableStream(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
  await stream.allReady;
  return await new Response(stream).text();
}

describe("RLHF training-regime canonical discovery (rlhf-training-regime-page-001)", () => {
  test("publishes RLHF as a training-regime record and removes the glossary alias collision", async () => {
    const registry = await loadRegistry();
    const rlhf = registry.byId.get("training-regime.rlhf");
    expect(rlhf?.status).toBe("published");
    if (rlhf?.kind !== "training-regime") {
      throw new Error("expected training-regime.rlhf record in registry");
    }
    expect(rlhf.regimeType).toBe("alignment");
    expect(rlhf?.aliases).toEqual(
      expect.arrayContaining([
        "RLHF",
        "reinforcement learning from human feedback",
      ]),
    );
    expect(rlhf.relatedIds).toContain("concept.alignment");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("training-regime.rlhf")).toBe(true);

    const alignment = registry.byId.get("concept.alignment");
    expect(alignment?.aliases).not.toContain("RLHF");
  });

  test("published docs metadata exposes RLHF as the canonical training route with alignment navigation", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const page = pages.find((entry) => entry.url === "/docs/training/rlhf");
    expect(page?.frontmatter.kind).toBe("training-regime");
    expect(page?.frontmatter.registryId).toBe("training-regime.rlhf");
    expect(page?.frontmatter.status).toBe("published");
    expect(page?.messages.title).toBe(
      "Reinforcement Learning from Human Feedback",
    );
    expect(page?.messages.openingSummary).toContain("pretrained model");

    const rlhf = registry.byId.get("training-regime.rlhf");
    if (rlhf?.kind !== "training-regime") {
      throw new Error("expected training-regime.rlhf record in registry");
    }
    const related = deriveCuratedRelatedItems(
      rlhf,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );
    expect(
      related.find((item) => item.registryId === "concept.alignment")?.href,
    ).toBe("/docs/glossary/alignment");
  });

  test("search indexes RLHF aliases onto the canonical training route", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find(
      (entry) => entry.url === "/docs/training/rlhf",
    );
    expect(document?.kind).toBe("training-regime");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "RLHF",
        "reinforcement learning from human feedback",
      ]),
    );
    expect(document?.relatedIds).toContain("concept.alignment");

    const acronymResults = await docsSearchApi.search("RLHF");
    expect(acronymResults[0]?.url).toBe("/docs/training/rlhf");

    const fullNameResults = await docsSearchApi.search(
      "reinforcement learning from human feedback",
    );
    expect(
      fullNameResults.some((result) => result.url === "/docs/training/rlhf"),
    ).toBe(true);
  });
});

describe("RLHF training-regime page contract (rlhf-training-regime-page-002)", () => {
  test("includes the required localized page copy and local graph asset", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(messages.title).toBe("Reinforcement Learning from Human Feedback");
    expect(messages.openingSummary).toContain("post-training workflow");
    expect(messages.openingSummary).toContain("pretrained model");
    expect(messages.sections?.whatItIs.body).toContain("after pretraining");
    expect(messages.sections?.howItWorks.body).toContain("four steps");
    expect(messages.sections?.howItWorks.body).toContain("human raters rank");
    expect(messages.sections?.howItWorks.body).toContain("reward model");
    expect(messages.sections?.howItWorks.body).toContain(
      "reinforcement-learning optimizer updates the policy",
    );
    expect(assets.trainingFlow.type).toBe("graph");
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });

  test("renders the canonical /docs/training/rlhf route with ordered workflow teaching", async () => {
    const page = await loadTrainingRegimePage("rlhf");

    expect(page.frontmatter.kind).toBe("training-regime");
    expect(page.frontmatter.registryId).toBe("training-regime.rlhf");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.frontmatter.status).toBe("published");

    const html = await renderPageHtml(page);

    expect(html).toContain("At a glance");
    expect(html).toContain("What It Is");
    expect(html).toContain("Why It Exists");
    expect(html).toContain("How It Works");
    expect(html).toContain('data-page-asset="trainingFlow"');
    expect(html).toContain('data-graph-id="graph.rlhf-training-flow"');
    expect(html).not.toContain(page.messages.openingSummary ?? "");
    expect(html).toContain("post-training regime for shaping model behavior");
    expect(html).toContain("The workflow usually moves in four steps.");

    const startingPolicyIndex = html.indexOf(
      "pretrained or supervised-fine-tuned starting policy",
    );
    const humanRankingsIndex = html.indexOf("human raters rank");
    const rewardModelIndex = html.indexOf("reward model");
    const policyUpdateIndex = html.indexOf(
      "reinforcement-learning optimizer updates the policy",
    );

    expect(startingPolicyIndex).toBeGreaterThan(-1);
    expect(humanRankingsIndex).toBeGreaterThan(startingPolicyIndex);
    expect(rewardModelIndex).toBeGreaterThan(humanRankingsIndex);
    expect(policyUpdateIndex).toBeGreaterThan(rewardModelIndex);
  });
});
