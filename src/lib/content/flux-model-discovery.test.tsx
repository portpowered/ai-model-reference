/**
 * Retained per derived-page-validation policy: representative Flux search
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
import { resultsIncludeUrl } from "@/tests/search/helpers";

const MODEL_SLUG = "flux";
const MODEL_ID = "model.flux";
const MODEL_URL = modelPageHref(MODEL_SLUG);
const repoRoot = join(import.meta.dir, "../../..");

const FLUX_DISCOVERY_QUERIES = [
  { query: "Flux", expectFirst: true },
  { query: "FLUX.1", expectFirst: true },
  { query: "Black Forest Labs", expectFirst: true },
  { query: "image generation model", expectFirst: false },
  { query: "diffusion transformer image model", expectFirst: true },
] as const;

describe("Flux reader-facing discovery (flux-model-page-current-main-005)", () => {
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
        "Flux",
        "FLUX.1",
        "FLUX.2",
        "Black Forest Labs Flux",
        "Black Forest Labs",
        "text-to-image Flux",
        "diffusion transformer image model",
        "image generation model",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["foundations", "model-family"]),
    );
    expect(document?.bodyText.length).toBeGreaterThan(200);
    expect(document?.relatedIds).toContain("concept.diffusion-model");
    expect(document?.relatedIds).toContain("model.clip");
    expect(document?.relatedIds).toContain(
      "concept.text-to-image-conditioning",
    );
  });

  for (const { query, expectFirst } of FLUX_DISCOVERY_QUERIES) {
    test(`search query ${query} returns the canonical Flux model page`, async () => {
      const results = await docsSearchApi.search(query);

      expect(resultsIncludeUrl(results, MODEL_URL)).toBe(true);

      if (expectFirst) {
        expect(pageBaseUrl(results[0]?.url ?? "")).toBe(MODEL_URL);
      }
    });
  }

  test.each([
    "model-family",
    "foundations",
  ] as const)("tag browsing lists Flux under model groups for %s", async (tagSlug) => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups(tagSlug, messages, "en");
    const modelGroup = groups.find((group) => group.kind === "model");

    expect(modelGroup).toBeDefined();
    expect(
      modelGroup?.resources.some((resource) => resource.url === MODEL_URL),
    ).toBe(true);
  });

  test("registry related metadata connects to diffusion, latent, CLIP, and transformer paths", () => {
    const model = getModelById(MODEL_ID);

    expect(model?.relatedIds).toEqual(
      expect.arrayContaining([
        "concept.diffusion-model",
        "concept.denoising-generation",
        "concept.latent-space",
        "concept.classifier-free-guidance",
        "concept.text-to-image-conditioning",
        "concept.transformer-architecture",
        "model.clip",
        "module.diffusion-transformer-block",
        "paper.latent-diffusion",
        "training-regime.diffusion-training-objective",
      ]),
    );
  });

  test("curated related items resolve only to published adjacent targets", () => {
    const source = getRegistryRecordById(MODEL_ID);
    if (source?.kind !== "model") {
      throw new Error("expected model.flux in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(items.find((item) => item.registryId === "model.clip")?.href).toBe(
      "/docs/models/clip",
    );
    expect(
      items.find(
        (item) => item.registryId === "concept.text-to-image-conditioning",
      )?.href,
    ).toBe("/docs/concepts/text-to-image-conditioning");
    expect(
      items.find(
        (item) => item.registryId === "module.diffusion-transformer-block",
      )?.href,
    ).toBe("/docs/modules/diffusion-transformer-block");
    expect(
      items.find(
        (item) => item.registryId === "concept.classifier-free-guidance",
      )?.href,
    ).toBe("/docs/concepts/classifier-free-guidance");
    expect(
      items.find((item) => item.registryId === "concept.latent-space")?.href,
    ).toBe("/docs/concepts/latent-space");
    expect(
      items.find((item) => item.registryId === "paper.latent-diffusion")?.href,
    ).toBe("/docs/papers/latent-diffusion");
    expect(
      items.find((item) => item.registryId === "paper.diffusion-transformers")
        ?.href,
    ).toBeUndefined();
    expect(
      items
        .filter((item) => item.href !== undefined)
        .every((item) => item.href?.startsWith("/docs/")),
    ).toBe(true);
  });

  test("rendered related section offers diffusion, CLIP, and latent navigation paths", async () => {
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
    expect(curatedHtml).toContain('href="/docs/models/clip"');
    expect(curatedHtml).toContain(
      'href="/docs/concepts/text-to-image-conditioning"',
    );
    expect(curatedHtml).toContain('href="/docs/glossary/diffusion-model"');
    expect(curatedHtml).toContain('href="/docs/concepts/latent-space"');
    expect(curatedHtml).toContain(
      'href="/docs/concepts/classifier-free-guidance"',
    );
    expect(curatedHtml).not.toContain(
      'href="/docs/papers/diffusion-transformers"',
    );
    expect(derivedHtml).toContain('data-testid="derived-related-docs"');
    expect(derivedHtml).toContain(
      'href="/docs/modules/diffusion-transformer-block"',
    );
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

    expect(html).toContain("Flux");
    expect(html).toContain("What It Is");
    expect(html).toContain("Architecture");
    expect(html).toContain("Practical Notes");
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="tag-pill-list"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain('data-graph-id="graph.flux-architecture"');
    expect(html).toContain('href="/docs/models/clip"');
    expect(html).toContain('href="/docs/concepts/text-to-image-conditioning"');
    expect(html).not.toContain("Draft placeholder");
    expect(html).not.toContain("missing message");
    expect(html).not.toContain("missing asset");
    expect(html).not.toContain("data-missing-graph-id");
    expect(html).not.toContain('href="/docs/papers/diffusion-transformers"');
  });

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
          .getByRole("heading", { name: "Flux", exact: true })
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
          "graph.flux-architecture",
        );

        await page
          .locator('[data-testid="tag-pill-list"]')
          .first()
          .waitFor({ state: "visible" });
        await page
          .locator('[data-testid="citation-list"]')
          .first()
          .waitFor({ state: "visible" });
        await page
          .locator('[data-testid="derived-related-docs"]')
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
