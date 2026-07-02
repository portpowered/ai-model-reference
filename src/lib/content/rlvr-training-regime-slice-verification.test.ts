import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { resolveCitations } from "@/lib/content/citations";
import {
  getContentRoot,
  getRegistryRoot,
  TRAINING_DOCS_ROOT,
} from "@/lib/content/content-paths";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import {
  getPublishedDocsEntryByRegistryId,
  PUBLISHED_DOCS_REGISTRY_IDS,
} from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getTrainingRegimeById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadTrainingRegimePage } from "@/lib/content/training-regime-page";
import { loadTrainingRegimePageFromDisk } from "@/lib/content/training-regime-page-load";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { docsSearchApi } from "@/lib/search/search-server";
import {
  closePlaywrightBrowserWithTimeout,
  launchPlaywrightBrowser,
} from "@/lib/verify/launch-playwright-browser";
import {
  acquireVerifyServerSession,
  shouldRunVerifyProductionIntegrationTests,
} from "@/lib/verify/server-lifecycle";
import { validateGeneratedPageBundle } from "./validate-generated-page-bundle";
import { validateRegistryContent } from "./validate-registry";

const REGISTRY_ID = "training-regime.rlvr";
const SLUG = "rlvr";
const PAGE_URL = "/docs/training/rlvr";
const GRAPH_ID = "graph.rlvr-training-flow";
const DEEPSEEK_R1_CITATION_ID = "citation.deepseek-r1";

const pageDir = join(TRAINING_DOCS_ROOT, SLUG);
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");
const repoRoot = join(import.meta.dir, "../../..");

const TOUCHED_RECORD_IDS = [
  REGISTRY_ID,
  DEEPSEEK_R1_CITATION_ID,
  GRAPH_ID,
] as const;

function resultsIncludeUrl(
  results: Array<{ url: string }>,
  pageUrl: string,
): boolean {
  return results.some(
    (result) =>
      pageBaseUrl(result.url) === pageUrl ||
      result.url.startsWith(`${pageUrl}#`),
  );
}

/**
 * Routine page-bundle checks (frontmatter, messages, registryId, tags, assets)
 * are covered by `validateDerivedPublishedPageBundles` via `validateRegistryContent`.
 * These tests stay focused on search, discovery, nearby-regime navigation, citation/graph
 * resolution, and rendered surface contracts specific to the RLVR slice.
 */
describe("RLVR training-regime slice verification (rlvr-training-regime-page-005)", () => {
  test("canonical route resolves to the published registry record and default English messages", async () => {
    const entry = getPublishedDocsEntryByRegistryId(REGISTRY_ID);
    const page = await loadTrainingRegimePage(SLUG);
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const record = getTrainingRegimeById(REGISTRY_ID);

    expect(entry).toMatchObject({
      registryId: REGISTRY_ID,
      url: PAGE_URL,
    });
    expect(record?.status).toBe("published");
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(REGISTRY_ID)).toBe(true);
    expect(page.frontmatter.registryId).toBe(REGISTRY_ID);
    expect(page.frontmatter.kind).toBe("training-regime");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(page.messages.openingSummary).toContain("external verifier");
  });

  test("page-local graph, caption, and citation references resolve for the bundle", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );
    const record = getTrainingRegimeById(REGISTRY_ID);

    if (!record) {
      throw new Error("expected training-regime.rlvr in registry");
    }

    expect(assets.trainingFlow).toMatchObject({
      type: "graph",
      graphId: GRAPH_ID,
      altKey: "assets.trainingFlow.alt",
      captionKey: "assets.trainingFlow.caption",
    });
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
    expect(getGraphById(GRAPH_ID)?.subjectId).toBe(REGISTRY_ID);
    expect(messages.assets?.trainingFlow?.alt).toContain("verifier check");
    expect(messages.graph?.nodes?.prompt?.label).toBe("Task prompt");
    expect(messages.graph?.nodes?.reward?.label).toBe("Reward assignment");

    const citations = resolveCitations(record.citationIds);
    expect(citations).toHaveLength(1);
    expect(citations[0]?.id).toBe(DEEPSEEK_R1_CITATION_ID);
    expect(citations[0]?.url).toContain("arxiv.org");
    expect(citations[0]?.title).toContain("DeepSeek-R1");
  });

  test("discovery metadata and live search resolve the canonical page for RLVR aliases", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find((entry) => entry.url === PAGE_URL);

    expect(document).toBeDefined();
    expect(document?.registryId).toBe(REGISTRY_ID);
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "RLVR",
        "Reinforcement Learning with Verifiable Rewards",
        "reinforcement learning from verifiable rewards",
        "verifiable rewards",
      ]),
    );
    expect(document?.relatedIds).toEqual(
      expect.arrayContaining([
        "concept.alignment",
        "training-regime.post-training",
        "training-regime.dpo",
        "model.nemotron-3-super",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["alignment", "foundations"]),
    );

    const results = await docsSearchApi.search("RLVR");
    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeUrl(results, PAGE_URL)).toBe(true);
  });

  test.each([
    "RLVR",
    "Reinforcement Learning with Verifiable Rewards",
    "reinforcement learning from verifiable rewards",
    "verifiable rewards",
  ] as const)("live search routes %s to the canonical RLVR page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(PAGE_URL);
  });

  test("curated related items and tag landing expose nearby alignment and training discovery paths", async () => {
    const source = getTrainingRegimeById(REGISTRY_ID);
    if (!source) {
      throw new Error("expected training-regime.rlvr in registry");
    }

    const relatedItems = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      relatedItems.find((item) => item.registryId === "concept.alignment")?.href,
    ).toBe("/docs/concepts/alignment");
    expect(
      relatedItems.find(
        (item) => item.registryId === "training-regime.post-training",
      )?.href,
    ).toBe("/docs/training/post-training");
    expect(
      relatedItems.find(
        (item) => item.registryId === "training-regime.supervised-fine-tuning",
      )?.href,
    ).toBe("/docs/training/supervised-fine-tuning");
    expect(
      relatedItems.find((item) => item.registryId === "model.nemotron-3-super")
        ?.href,
    ).toBe("/docs/models/nemotron-3-super");

    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups("alignment", messages, "en");
    const trainingGroup = groups.find(
      (group) => group.kind === "training-regime",
    );

    expect(
      trainingGroup?.resources.some((resource) => resource.url === PAGE_URL),
    ).toBe(true);
  });

  test("rendered training-regime page exposes flow graph, nearby-regime links, tags, citations, and related docs", async () => {
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
    expect(html).toContain("What It Is");
    expect(html).toContain("Compared To Nearby Regimes");
    expect(html).toContain("Limitations And Failure Modes");
    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain("Task prompt");
    expect(html).toContain("Reward assignment");
    expect(html).toContain("Policy update");
    expect(html).toContain('href="/docs/concepts/alignment"');
    expect(html).toContain('href="/docs/training/post-training"');
    expect(html).toContain('href="/search?q=RLHF"');
    expect(html).toContain('href="/search?q=GRPO"');
    expect(html).toContain('href="/docs/models/nemotron-3-super"');
    expect(html).toContain('href="/tags/alignment"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain("DeepSeek-R1");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain("missing-content");
  });

  test(
    "content and registry validation pass for the RLVR slice",
    async () => {
    const registryPath = join(getRegistryRoot(), "training-regimes", `${SLUG}.json`);
    const indexes = await loadRegistry({ registryRoot: getRegistryRoot() });

    const bundleErrors = await validateGeneratedPageBundle({
      registryRoot: getRegistryRoot(),
      docsRoot: join(getContentRoot(), "docs"),
      pageDirectory: pageDir,
      registryPath,
      pageUrl: PAGE_URL,
      indexes,
    });
    expect(bundleErrors).toEqual([]);

    const loaded = await loadTrainingRegimePageFromDisk(SLUG, "en");
    expect(loaded.frontmatter.status).toBe("published");
    expect(loaded.frontmatter.registryId).toBe(REGISTRY_ID);

    const registryIssues = await validateRegistryContent();
    const touchedIssues = registryIssues.filter((issue) =>
      TOUCHED_RECORD_IDS.some((recordId) => issue.message.includes(recordId)),
    );
    expect(touchedIssues).toEqual([]);
    },
    { timeout: 30_000 },
  );

  test("served RLVR page renders title, sections, flow graph, tags, and references without errors", async () => {
    if (!shouldRunVerifyProductionIntegrationTests(repoRoot)) {
      return;
    }

    const session = await acquireVerifyServerSession({ projectRoot: repoRoot });
    const browser = await launchPlaywrightBrowser();

    try {
      for (const viewport of [
        { width: 1280, height: 800 },
        { width: 375, height: 667 },
      ]) {
        const page = await browser.newPage({ viewport });
        page.setDefaultTimeout(30_000);
        await page.goto(`${session.baseUrl}${PAGE_URL}`, {
          waitUntil: "load",
        });

        await page
          .getByRole("heading", {
            name: "Reinforcement Learning with Verifiable Rewards",
            exact: true,
          })
          .waitFor({ state: "visible" });

        for (const sectionTitle of [
          "What It Is",
          "Why It Exists",
          "How It Works",
          "Compared To Nearby Regimes",
          "Limitations And Failure Modes",
          "Related To",
          "Tags",
          "References",
        ]) {
          await page
            .getByRole("heading", { name: sectionTitle })
            .first()
            .waitFor({ state: "visible" });
        }

        const graph = page.locator('[data-react-flow-graph="true"]');
        await graph.waitFor({ state: "visible" });
        expect(await graph.getAttribute("data-graph-id")).toBe(GRAPH_ID);

        await page
          .locator('[data-testid="tag-pill-list"]')
          .first()
          .waitFor({ state: "visible" });
        await page
          .locator('[data-testid="citation-list"]')
          .first()
          .waitFor({ state: "visible" });
        await page
          .locator('[data-testid="curated-related-docs"]')
          .first()
          .waitFor({ state: "visible" });

        const bodyText = await page.locator("article").innerText();
        expect(bodyText).toContain("external verifier");
        expect(bodyText).toContain("Task prompt");
        expect(bodyText).not.toContain("missing message");
        expect(bodyText).not.toContain("missing asset");
        expect(bodyText).not.toContain("missing-content");

        await page.close();
      }
    } finally {
      await closePlaywrightBrowserWithTimeout(browser);
      await session.cleanup();
    }
  }, 120_000);
});
