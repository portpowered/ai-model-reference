/**
 * Retained per derived-page-validation policy: representative LTX-2.3 search
 * ranking, tag browsing, and curated related-doc navigation cannot be expressed
 * as derived bundle invariants alone.
 */
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
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
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getModelById,
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
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

const MODEL_SLUG = "ltx-23";
const MODEL_ID = "model.ltx-23";
const MODEL_URL = modelPageHref(MODEL_SLUG);
const repoRoot = join(import.meta.dir, "../../..");

const TOUCHED_RECORD_IDS = [
  "model.ltx-23",
  "paper.ltx-2",
  "paper.latent-diffusion",
  "graph.ltx-23-architecture",
  "module.cross-attention",
  "training-regime.diffusion-training-objective",
  "citation.ltx-2-3-huggingface",
  "citation.ltx-2-3-model-page",
  "citation.ltx-2-efficient-joint-audio-visual-foundation-model",
  "citation.ltx-2-repository",
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

describe("LTX-2.3 reader-facing discovery (ltx-23-004)", () => {
  test("search documents carry canonical aliases, tags, and registry metadata", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find((entry) => entry.url === MODEL_URL);

    expect(document).toBeDefined();
    expect(document?.kind).toBe("model");
    expect(document?.registryId).toBe(MODEL_ID);
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "LTX-2.3",
        "LTX 2.3",
        "LTX-23",
        "ltx-23",
        "LTX Video 2.3",
        "LTXV 2.3",
        "audio video diffusion model",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["foundations", "model-family"]),
    );
    expect(document?.bodyText.length).toBeGreaterThan(200);
  });

  test.each([
    "LTX-2.3",
    "LTX 2.3",
    "ltx-23",
    "LTX Video 2.3",
    "audio video diffusion model",
  ] as const)("search ranks the canonical model page first for %s", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(resultsIncludeUrl(results, MODEL_URL)).toBe(true);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(MODEL_URL);
  });

  test.each([
    "model-family",
    "foundations",
  ] as const)("tag browsing lists LTX-2.3 under model groups for %s", async (tagSlug) => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups(tagSlug, messages, "en");
    const modelGroup = groups.find((group) => group.kind === "model");

    expect(modelGroup).toBeDefined();
    expect(
      modelGroup?.resources.some((resource) => resource.url === MODEL_URL),
    ).toBe(true);
  });

  test("registry related metadata connects to diffusion, latent, multimodal, and transformer paths", () => {
    const model = getModelById(MODEL_ID);

    expect(model?.relatedIds).toEqual(
      expect.arrayContaining([
        "concept.diffusion-model",
        "concept.latent-space",
        "concept.multimodal-model",
        "concept.conditioning",
        "concept.transformer-architecture",
        "paper.latent-diffusion",
        "module.cross-attention",
        "training-regime.diffusion-training-objective",
      ]),
    );
  });

  test("curated related items resolve only to published adjacent targets", () => {
    const source = getRegistryRecordById(MODEL_ID);
    if (source?.kind !== "model") {
      throw new Error("expected model.ltx-23 in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "module.cross-attention")?.href,
    ).toBe("/docs/modules/cross-attention");
    expect(
      items.find((item) => item.registryId === "paper.latent-diffusion")?.href,
    ).toBe("/docs/papers/latent-diffusion");
    expect(
      items.find(
        (item) => item.registryId === "concept.transformer-architecture",
      )?.href,
    ).toBe("/docs/concepts/transformer-architecture");
    expect(
      items.find((item) => item.registryId === "concept.diffusion-model")?.href,
    ).toBe("/docs/glossary/diffusion-model");
    expect(
      items.find((item) => item.registryId === "concept.latent-space")?.href,
    ).toBe("/docs/glossary/latent-space");
    expect(
      items.find((item) => item.registryId === "paper.ltx-2")?.href,
    ).toBeUndefined();
    expect(
      items
        .filter((item) => item.href !== undefined)
        .every((item) => item.href?.startsWith("/docs/")),
    ).toBe(true);
  });

  test("rendered related section offers diffusion, cross-attention, and latent navigation paths", async () => {
    const curatedHtml = renderToStaticMarkup(
      createElement(RelatedDocs, { registryId: MODEL_ID }),
    );
    const derivedHtml = renderToStaticMarkup(
      createElement(DerivedRelatedDocs, {
        registryId: MODEL_ID,
        groups: [
          "same-model-family",
          "shared-modules",
          "shared-training-regimes",
          "shared-tags",
          "curated-related",
        ],
      }),
    );

    expect(curatedHtml).toContain('data-testid="curated-related-docs"');
    expect(curatedHtml).toContain('href="/docs/modules/cross-attention"');
    expect(curatedHtml).toContain('href="/docs/papers/latent-diffusion"');
    expect(curatedHtml).toContain('href="/docs/glossary/diffusion-model"');
    expect(curatedHtml).toContain('href="/docs/glossary/latent-space"');
    expect(curatedHtml).toContain(
      'href="/docs/concepts/transformer-architecture"',
    );
    expect(curatedHtml).not.toContain('href="/docs/papers/ltx-2"');
    expect(derivedHtml).toContain('data-testid="derived-related-docs"');
    expect(derivedHtml).toContain('href="/docs/modules/cross-attention"');
    expect(derivedHtml).toContain(
      'href="/docs/training/diffusion-training-objective"',
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

    expect(html).toContain("LTX-2.3");
    expect(html).toContain("What It Is");
    expect(html).toContain("Architecture");
    expect(html).toContain("Practical Notes");
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain('data-graph-id="graph.ltx-23-architecture"');
    expect(html).not.toContain("Draft placeholder");
    expect(html).not.toContain("missing message");
    expect(html).not.toContain("missing asset");
    expect(html).not.toContain("data-missing-graph-id");
    expect(html).not.toContain('href="/docs/papers/ltx-2"');
  });

  test("content and registry validation pass for the LTX-2.3 slice", async () => {
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
    expect(loaded.frontmatter.registryId).toBe(MODEL_ID);

    const registryIssues = await validateRegistryContent();
    const touchedIssues = registryIssues.filter((issue) =>
      TOUCHED_RECORD_IDS.some((recordId) => issue.message.includes(recordId)),
    );
    expect(touchedIssues).toEqual([]);
  }, 30_000);

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
          .getByRole("heading", { name: "LTX-2.3", exact: true })
          .waitFor({ state: "visible" });

        for (const sectionTitle of [
          "What It Is",
          "Inputs And Outputs",
          "Architecture",
          "Practical Notes",
          "Related Models, Modules, And Papers",
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
        expect(await graph.getAttribute("data-graph-id")).toBe(
          "graph.ltx-23-architecture",
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
