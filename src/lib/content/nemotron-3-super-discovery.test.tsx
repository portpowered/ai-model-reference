import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";
import { modelPageHref } from "@/lib/content/content-hrefs";
import {
  getContentRoot,
  getModelsDocsRoot,
  getRegistryRoot,
} from "@/lib/content/content-paths";
import { loadModelPage } from "@/lib/content/model-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
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
import { loadModelPageFromDisk } from "./model-page-load";
import { validateGeneratedPageBundle } from "./validate-generated-page-bundle";
import { validateRegistryContent } from "./validate-registry";

const MODEL_SLUG = "nemotron-3-super";
const MODEL_URL = modelPageHref(MODEL_SLUG);
const repoRoot = join(import.meta.dir, "../../..");

const TOUCHED_RECORD_IDS = [
  "model.nemotron-3-super",
  "paper.nemotron-3-super",
  "organization.nvidia",
  "module.mixture-of-experts",
  "concept.context-window",
  "system.routing",
  "system.inference-engine",
  "system.deployment",
  "graph.nemotron-3-super-architecture",
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

describe("nemotron 3 super reader-facing discovery (nemotron-3-super-model-page-005)", () => {
  test("search documents carry canonical aliases, tags, and registry metadata", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find((entry) => entry.url === MODEL_URL);

    expect(document).toBeDefined();
    expect(document?.kind).toBe("model");
    expect(document?.registryId).toBe("model.nemotron-3-super");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "Nemotron 3 Super",
        "Nemotron-3-Super-120B-A12B-BF16",
        "nvidia/nemotron-3-super-120b-a12b",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining([
        "foundations",
        "model-family",
        "context-window",
        "quantization",
      ]),
    );
    expect(document?.bodyText.length).toBeGreaterThan(200);
  });

  test.each([
    "Nemotron 3 Super",
    "Nemotron",
    "nemotron",
    "Nemotron-3-Super-120B-A12B-BF16",
  ] as const)("search ranks the canonical model page first for %s", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(MODEL_URL);
  });

  test.each([
    "MoE",
    "mixture of experts",
    "context window",
  ] as const)("search includes the Nemotron 3 Super model page for %s", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(resultsIncludeUrl(results, MODEL_URL)).toBe(true);
  });

  test.each([
    "model-family",
    "context-window",
    "foundations",
    "quantization",
  ] as const)("tag browsing lists Nemotron 3 Super under model groups for %s", async (tagSlug) => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups(tagSlug, messages, "en");
    const modelGroup = groups.find((group) => group.kind === "model");

    expect(modelGroup).toBeDefined();
    expect(
      modelGroup?.resources.some((resource) => resource.url === MODEL_URL),
    ).toBe(true);
  });

  test("rendered related section offers MoE, context-window, routing, and serving paths", async () => {
    const curatedHtml = renderToStaticMarkup(
      createElement(RelatedDocs, { registryId: "model.nemotron-3-super" }),
    );

    expect(curatedHtml).toContain('data-testid="curated-related-docs"');
    expect(curatedHtml).toContain('href="/docs/modules/mixture-of-experts"');
    expect(curatedHtml).toContain(
      'href="/docs/modules/mamba-selective-state-space"',
    );
    expect(curatedHtml).toContain('href="/docs/glossary/context-window"');
    expect(curatedHtml).toContain('href="/docs/systems/routing"');
    expect(curatedHtml).toContain('href="/docs/systems/inference-engine"');
    expect(curatedHtml).toContain('href="/docs/systems/deployment"');
    expect(curatedHtml).toContain(
      'href="/docs/concepts/transformer-architecture"',
    );

    const page = await loadModelPage(MODEL_SLUG);
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain("Nemotron 3 Super");
    expect(html).toContain("What It Is");
    expect(html).toContain("Architecture");
    expect(html).toContain("Practical Notes");
    expect(html).toContain('href="/docs/modules/mamba-selective-state-space"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain(
      'data-graph-id="graph.nemotron-3-super-architecture"',
    );
    expect(html).not.toContain("Draft placeholder");
    expect(html).not.toContain("missing message");
    expect(html).not.toContain("missing asset");
    expect(html).not.toContain("data-missing-graph-id");
  });

  test(
    "content and registry validation pass for the Nemotron 3 Super slice",
    async () => {
      const modelsDocsRoot = getModelsDocsRoot();
      const pageDir = join(modelsDocsRoot, MODEL_SLUG);
      const registryPath = join(
        getRegistryRoot(),
        "models",
        `${MODEL_SLUG}.json`,
      );
      const indexes = await loadRegistry({ registryRoot: getRegistryRoot() });

      const bundleErrors = await validateGeneratedPageBundle({
        registryRoot: getRegistryRoot(),
        docsRoot: join(getContentRoot(), "docs"),
        pageDirectory: pageDir,
        registryPath,
        pageUrl: MODEL_URL,
        indexes,
      });
      expect(bundleErrors).toEqual([]);

      const loaded = await loadModelPageFromDisk(
        MODEL_SLUG,
        "en",
        modelsDocsRoot,
      );
      expect(loaded.frontmatter.status).toBe("published");
      expect(loaded.frontmatter.registryId).toBe("model.nemotron-3-super");

      const registryIssues = await validateRegistryContent();
      const touchedIssues = registryIssues.filter((issue) =>
        TOUCHED_RECORD_IDS.some((recordId) => issue.message.includes(recordId)),
      );
      expect(touchedIssues).toEqual([]);
    },
    { timeout: 30_000 },
  );

  test("served model page renders title, sections, graph, tags, and references without errors", async () => {
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
        await page.goto(`${session.baseUrl}${MODEL_URL}`, {
          waitUntil: "load",
        });

        await page
          .getByRole("heading", { name: "Nemotron 3 Super", exact: true })
          .waitFor({ state: "visible" });

        for (const sectionTitle of [
          "What It Is",
          "Architecture",
          "Practical Notes",
          "Related",
          "References",
        ]) {
          await page
            .getByRole("heading", { name: sectionTitle })
            .first()
            .waitFor({ state: "visible" });
        }

        const graph = page.locator('[data-react-flow-graph="true"]');
        await graph.waitFor({ state: "visible" });
        expect(await graph.getAttribute("data-graph-id")).toBe(
          "graph.nemotron-3-super-architecture",
        );

        await page
          .locator('[data-testid="tag-pill-list"]')
          .first()
          .waitFor({ state: "visible" });
        await page
          .locator('[data-testid="citation-list"]')
          .first()
          .waitFor({ state: "visible" });

        const bodyText = await page.locator("article").innerText();
        expect(bodyText).not.toContain("Draft placeholder");
        expect(bodyText).not.toContain("missing message");
        expect(bodyText).not.toContain("missing asset");

        await page.close();
      }
    } finally {
      await closePlaywrightBrowserWithTimeout(browser);
      await session.cleanup();
    }
  }, 120_000);
});
