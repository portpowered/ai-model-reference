import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
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
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadTrainingRegimePage } from "@/lib/content/training-regime-page";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "training-regime.rlvr";
const SLUG = "rlvr";
const PAGE_URL = "/docs/training/rlvr";
const GRAPH_ID = "graph.rlvr-training-flow";

function pageBaseUrl(url: string): string {
  return url.split("#")[0] ?? url;
}

describe("RLVR training-regime identity contracts", () => {
  test("registry record publishes canonical aliases, classification, relationships, and citation metadata", () => {
    const record = getTrainingRegimeById(REGISTRY_ID);

    expect(record?.status).toBe("published");
    expect(record?.slug).toBe("rlvr");
    expect(record?.kind).toBe("training-regime");
    expect(record?.aliases).toEqual([
      "RLVR",
      "Reinforcement Learning with Verifiable Rewards",
      "reinforcement learning from verifiable rewards",
      "verifiable rewards",
    ]);
    expect(record?.tags).toEqual(["alignment", "foundations"]);
    expect(record?.primaryClassificationId).toBe("classification.training");
    expect(record?.regimeType).toBe("rl");
    expect(record?.relatedIds).toEqual([
      "concept.alignment",
      "training-regime.post-training",
      "training-regime.supervised-fine-tuning",
      "training-regime.instruction-tuning",
      "training-regime.dpo",
      "model.nemotron-3-super",
      "paper.deepseek-v4",
    ]);
    expect(record?.citationIds).toEqual(["citation.deepseek-r1"]);
    expect(record?.variantGroup).toBe("verifiable-reward-optimization");
    expect(getPrimaryClassificationForRecord(REGISTRY_ID)?.id).toBe(
      "classification.training",
    );
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
  });

  test("published docs inventory resolves the canonical route and registry id together", async () => {
    const pages = await loadPublishedDocsPages("en");
    const page = pages.find((entry) => entry.url === PAGE_URL);

    expect(page).toBeDefined();
    expect(page?.docsSlug).toBe("training/rlvr");
    expect(page?.frontmatter.kind).toBe("training-regime");
    expect(page?.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page?.frontmatter.messageNamespace).toBe("local");
    expect(page?.frontmatter.assetNamespace).toBe("local");
    expect(page?.messages.title).toBe(
      "Reinforcement Learning with Verifiable Rewards",
    );
    expect(page?.messages.openingSummary).toContain("RLVR");
    expect(page?.messages.openingSummary).toContain("external verifier");
  });

  test(
    "canonical RLVR bundle resolves registry record, English messages, and citation together",
    async () => {
      const record = getTrainingRegimeById(REGISTRY_ID);
      if (!record) {
        throw new Error("expected training-regime.rlvr in registry");
      }

      const page = await loadTrainingRegimePage("rlvr");
      const citation = getCitationById("citation.deepseek-r1");

      expect(page.frontmatter.kind).toBe("training-regime");
      expect(page.frontmatter.registryId).toBe(record.id);
      expect(page.messages.description).toContain("externally checkable");
      expect(record.defaultTitleKey).toBe("title");
      expect(record.defaultSummaryKey).toBe("description");
      expect(citation?.url).toBe("https://arxiv.org/abs/2501.12948");
      expect(citation?.title).toContain("DeepSeek-R1");
    },
    { timeout: 15000 },
  );

  test("curated related docs keep RLVR attached to alignment, post-training, preference, and reasoning discovery paths", () => {
    const source = getTrainingRegimeById(REGISTRY_ID);
    if (!source) {
      throw new Error("expected training-regime.rlvr in registry");
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
      items.find((item) => item.registryId === "training-regime.post-training")
        ?.href,
    ).toBe("/docs/training/post-training");
    expect(
      items.find(
        (item) => item.registryId === "training-regime.supervised-fine-tuning",
      )?.href,
    ).toBe("/docs/training/supervised-fine-tuning");
    expect(
      items.find(
        (item) => item.registryId === "training-regime.instruction-tuning",
      )?.href,
    ).toBe("/docs/training/instruction-tuning");
    expect(
      items.find((item) => item.registryId === "training-regime.dpo")?.href,
    ).toBe("/docs/training/dpo");
    expect(
      items.find((item) => item.registryId === "model.nemotron-3-super")?.href,
    ).toBe("/docs/models/nemotron-3-super");
    expect(
      items.find((item) => item.registryId === "paper.deepseek-v4")?.href,
    ).toBe("/docs/papers/deepseek-v4");
  });

  test("alignment tag landing exposes RLVR among training-regime discovery paths", async () => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups("alignment", messages, "en");
    const trainingGroup = groups.find(
      (group) => group.kind === "training-regime",
    );

    expect(
      trainingGroup?.resources.some((resource) => resource.url === PAGE_URL),
    ).toBe(true);
  });

  test("search documents and runtime search resolve RLVR aliases and core terms", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);

    const document = documents.find((entry) => entry.url === PAGE_URL);
    expect(document?.kind).toBe("training-regime");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "RLVR",
        "Reinforcement Learning with Verifiable Rewards",
        "reinforcement learning from verifiable rewards",
        "verifiable rewards",
      ]),
    );
    expect(document?.relatedIds).toEqual([
      "concept.alignment",
      "training-regime.post-training",
      "training-regime.supervised-fine-tuning",
      "training-regime.instruction-tuning",
      "training-regime.dpo",
      "model.nemotron-3-super",
      "paper.deepseek-v4",
    ]);
    expect(document?.tags).toEqual(
      expect.arrayContaining(["alignment", "foundations"]),
    );

    for (const query of [
      "RLVR",
      "Reinforcement Learning with Verifiable Rewards",
      "reinforcement learning from verifiable rewards",
      "verifiable rewards",
    ]) {
      const results = await docsSearchApi.search(query);
      expect(pageBaseUrl(results[0]?.url ?? "")).toBe(PAGE_URL);
    }
  });

  test(
    "rendered RLVR explainer page exposes opening summary, core sections, flow graph, tags, citations, and related docs without missing-content placeholders",
    async () => {
      const page = await loadTrainingRegimePage(SLUG);

      const html = renderToStaticMarkup(
        createElement(ModulePageProviders, {
          messages: page.messages,
          assets: page.assets,
          // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
          children: page.content,
        }),
      );

      expect(html).toContain("Reinforcement Learning with Verifiable Rewards");
      expect(html).toContain("external verifier");
      expect(html).toContain("exact-answer math");
      expect(html).toContain("What It Is");
      expect(html).toContain("Why It Exists");
      expect(html).toContain("How It Works");
      expect(html).toContain("Compared To Nearby Regimes");
      expect(html).toContain("Limitations And Failure Modes");
      expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
      expect(html).toContain("Task prompt");
      expect(html).toContain("Model response");
      expect(html).toContain("Verifier check");
      expect(html).toContain("Reward assignment");
      expect(html).toContain("Policy update");
      expect(html).toContain("human preference signals");
      expect(html).toContain("Group Relative Policy Optimization");
      expect(html).toContain("Supervised fine-tuning");
      expect(html).toContain("verifier coverage");
      expect(html).toContain("reward hacking");
      expect(html).toContain("Task narrowness");
      expect(html).toContain('href="/docs/concepts/alignment"');
      expect(html).toContain('href="/docs/training/post-training"');
      expect(html).toContain('href="/docs/training/supervised-fine-tuning"');
      expect(html).toContain('href="/docs/training/instruction-tuning"');
      expect(html).toContain('href="/docs/training/dpo"');
      expect(html).toContain('href="/search?q=RLHF"');
      expect(html).toContain('href="/search?q=GRPO"');
      expect(html).toContain('href="/docs/models/nemotron-3-super"');
      expect(html).toContain('href="/docs/papers/deepseek-v4"');
      expect(html).toContain("DeepSeek-R1");
      expect(html).toContain("verifier-based reinforcement learning");
      expect(html).toContain('href="/tags/alignment"');
      expect(html).toContain('data-testid="tag-pill-list"');
      expect(html).toContain('data-testid="citation-list"');
      expect(html).toContain('data-testid="curated-related-docs"');
      expect(html).not.toContain("Reader Shortcut");
      expect(html).not.toContain("missing-content");
    },
    { timeout: 15000 },
  );

  test("English messages teach the verifier loop steps and adjacent-regime distinctions", async () => {
    const page = await loadTrainingRegimePage(SLUG);
    const howItWorks = page.messages.sections?.howItWorks.body ?? "";
    const whyItExists = page.messages.sections?.whyItExists.body ?? "";
    const compared = page.messages.sections?.comparedToNearbyRegimes.body ?? "";
    const limits =
      page.messages.sections?.limitationsAndFailureModes.body ?? "";

    expect(howItWorks).toContain("task prompt");
    expect(whyItExists).toContain("DeepSeek-R1");
    expect(whyItExists).toContain("verifier-based reinforcement learning");
    expect(howItWorks).toContain("candidate response");
    expect(howItWorks).toContain("external verifier");
    expect(howItWorks).toContain("reward signal");
    expect(howItWorks).toContain("policy update");

    expect(compared).toContain("Supervised fine-tuning");
    expect(compared).toContain("human preference signals");
    expect(compared).toContain("Group Relative Policy Optimization");
    expect(compared).toContain("externally checkable outcomes");

    expect(limits).toContain("verifier coverage");
    expect(limits).toContain("reward hacking");
    expect(limits).toContain("Task narrowness");
    expect(limits).toContain("Verifiable success");
  });
});
