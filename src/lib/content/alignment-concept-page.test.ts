import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { loadConceptPage } from "@/lib/content/concept-page";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  getPublishedDocsEntryByRegistryId,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getConceptById,
  getTrainingRegimeById,
} from "@/lib/content/registry-runtime";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";

const REGISTRY_ID = "concept.alignment";
const PAGE_URL = "/docs/concepts/alignment";

const pageDir = getDocsPageDir("concepts", "alignment");
const messagesPath = join(pageDir, "messages/en.json");

function pageBaseUrlFromResults(
  results: Array<{ url: string }>,
  pageUrl: string,
): boolean {
  return results.some(
    (result) =>
      pageBaseUrl(result.url) === pageUrl ||
      result.url.startsWith(`${pageUrl}#`),
  );
}

describe("alignment concept page (alignment-concept-page-001)", () => {
  test("registry record and published docs entry resolve the concepts route", () => {
    const record = getConceptById("concept.alignment");
    expect(record?.status).toBe("published");
    expect(record?.kind).toBe("concept");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("concept.alignment")).toBe(true);

    const entry = getPublishedDocsEntryByRegistryId("concept.alignment");
    expect(entry?.pageKind).toBe("concept");
    expect(entry?.section).toBe("concepts");
    expect(entry?.docsSlug).toBe("concepts/alignment");
  });

  test("page renders isolation-first alignment summary and standard concept sections", async () => {
    const page = await loadConceptPage("alignment");

    expect(page.frontmatter.kind).toBe("concept");
    expect(page.frontmatter.status).toBe("published");
    expect(page.frontmatter.registryId).toBe("concept.alignment");
    expect(page.messages.openingSummary?.toLowerCase()).toContain("pretrained");
    expect(page.messages.openingSummary?.toLowerCase()).toContain("preference");

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
    expect(html).toContain("helpful");
    expect(html).toContain("pretraining");
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).not.toContain("Reader Shortcut");
  });
});

describe("alignment concept page (alignment-concept-page-002)", () => {
  test("messages distinguish pretraining, alignment methods, and benchmark misuse", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    const nearby = messages.sections?.comparedToNearbyRegimes.body ?? "";
    expect(nearby.toLowerCase()).toContain("pretraining");
    expect(nearby.toLowerCase()).toContain("large-scale");
    expect(nearby.toLowerCase()).toContain("human preferences");
    expect(nearby.toLowerCase()).toContain("helpfulness");
    expect(nearby.toLowerCase()).toContain("safety");
    expect(nearby.toLowerCase()).toContain("direct preference optimization");
    expect(nearby.toLowerCase()).toContain(
      "reinforcement learning from human feedback",
    );
    expect(nearby.toLowerCase()).toContain("proximal policy optimization");
    expect(nearby.toLowerCase()).toContain(
      "group relative policy optimization",
    );
    expect(nearby.toLowerCase()).toContain("benchmark leaderboard");

    const confusions = messages.sections?.commonConfusions.body ?? "";
    expect(confusions.toLowerCase()).toContain("benchmark");
    expect(confusions.toLowerCase()).toContain("leaderboard");
  });

  test("page renders nearby-regime links to pretraining, DPO, and safe search paths", async () => {
    const page = await loadConceptPage("alignment");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("Compared To Nearby Regimes");
    expect(html).toContain('href="/docs/training/pretraining"');
    expect(html).toContain('href="/docs/training/dpo"');
    expect(html).toContain('href="/search?q=RLHF"');
    expect(html).toContain('href="/search?q=PPO"');
    expect(html).toContain('href="/search?q=GRPO"');
    expect(html).toContain("not a benchmark leaderboard");
  });
});

describe("alignment concept page (alignment-concept-page-003)", () => {
  test("registry aliases match the canonical concept page without duplicate concept records", () => {
    const record = getConceptById(REGISTRY_ID);
    expect(record?.status).toBe("published");
    expect(record?.aliases).toEqual([
      "Alignment",
      "model alignment",
      "preference alignment",
      "human feedback alignment",
      "safety alignment",
    ]);
    expect(record?.aliases).not.toContain("RLHF");
  });

  test("published docs entry prefers the concepts route over the glossary bundle", () => {
    const entry = getPublishedDocsEntryByRegistryId(REGISTRY_ID);
    expect(entry?.url).toBe(PAGE_URL);
    expect(entry?.section).toBe("concepts");
  });

  test("search documents carry alignment discovery aliases on the canonical concept page", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find((entry) => entry.url === PAGE_URL);

    expect(document).toBeDefined();
    expect(document?.registryId).toBe(REGISTRY_ID);
    expect(document?.directAliases).toEqual(
      expect.arrayContaining([
        "Alignment",
        "model alignment",
        "preference alignment",
        "human feedback alignment",
        "safety alignment",
      ]),
    );
  });

  test.each([
    "alignment",
    "model alignment",
    "preference alignment",
    "human feedback alignment",
  ] as const)("live search routes %s to the canonical alignment concept page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(PAGE_URL);
    expect(pageBaseUrlFromResults(results, PAGE_URL)).toBe(true);
  });

  test("nearby training regimes keep separate reader paths from the broad alignment concept", () => {
    const dpo = getTrainingRegimeById("training-regime.dpo");
    expect(dpo?.relatedIds).toContain(REGISTRY_ID);
    expect(dpo?.aliases).toEqual(
      expect.arrayContaining([
        "DPO",
        "Direct Preference Optimization",
        "preference optimization",
      ]),
    );
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("training-regime.dpo")).toBe(true);
  });
});
