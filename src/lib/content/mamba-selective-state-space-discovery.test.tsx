import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderBrowseIndexPage } from "@/app/(site)/site-renderers";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { modelPageHref, modulePageHref } from "@/lib/content/content-hrefs";
import { loadModelPage } from "@/lib/content/model-page";
import { loadModulePage } from "@/lib/content/module-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getModuleById,
  listClassificationMembers,
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
import { MAMBA_SELECTIVE_STATE_SPACE_GRAPH_ID } from "@/lib/verify/mamba-selective-state-space-module-convergence";
import {
  acquireVerifyServerSession,
  shouldRunVerifyProductionIntegrationTests,
} from "@/lib/verify/server-lifecycle";

const MAMBA_MODULE_URL = modulePageHref("mamba-selective-state-space");
const NEMOTRON_MODEL_URL = modelPageHref("nemotron-3-super");
const repoRoot = join(import.meta.dir, "../../..");

describe("mamba selective state-space discovery surfaces (MAMBA-004)", () => {
  test("search documents carry canonical aliases, tags, and registry metadata", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const document = documents.find((entry) => entry.url === MAMBA_MODULE_URL);

    expect(document).toBeDefined();
    expect(document?.kind).toBe("module");
    expect(document?.registryId).toBe("module.mamba-selective-state-space");
    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "Mamba",
        "Mamba block",
        "Mamba module",
        "selective state space model",
        "selective SSM",
        "state-space module",
        "SSM",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["state-space", "context-window"]),
    );
    expect(document?.relatedIds).toEqual(
      expect.arrayContaining([
        "module.attention",
        "module.linear-attention",
        "concept.context-window",
        "concept.transformer-architecture",
        "concept.why-long-context-is-hard",
        "model.nemotron-3-super",
      ]),
    );
    expect(document?.bodyText.length).toBeGreaterThan(200);
  });

  test.each([
    "Mamba",
    "Mamba module",
    "selective SSM",
    "state-space model",
    "state space sequence model",
  ] as const)("search ranks the canonical Mamba module page first for %s", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(pageBaseUrl(results[0]?.url ?? "")).toBe(MAMBA_MODULE_URL);
  });

  test("state-space and context-window tag browsing list the published Mamba module", async () => {
    const messages = await loadUiMessages();

    for (const tagSlug of ["state-space", "context-window"] as const) {
      const groups = await loadTagResourceGroups(tagSlug, messages, "en");
      const moduleGroup = groups.find((group) => group.kind === "module");

      expect(moduleGroup).toBeDefined();
      expect(
        moduleGroup?.resources.some(
          (resource) => resource.url === MAMBA_MODULE_URL,
        ),
      ).toBe(true);
    }
  });

  test("state-space classification browsing lists the Mamba module", async () => {
    const members = listClassificationMembers(
      "classification.module.state-space",
    ).map((member) => member.record.id);

    expect(members).toEqual(
      expect.arrayContaining(["module.mamba-selective-state-space"]),
    );

    const browsePage = await renderBrowseIndexPage(undefined, {
      searchParams: Promise.resolve({
        classification: "state-space-modules",
        mode: "graph-map",
      }),
    });
    const browseHtml = renderToStaticMarkup(browsePage);

    expect(browseHtml).toContain(MAMBA_MODULE_URL);
    expect(browseHtml).not.toContain("Nothing has shipped");
    expect(browseHtml).not.toContain("No resources");
  });

  test("curated related docs connect Mamba to attention, long-context, and hybrid-model pages", () => {
    const source = getModuleById("module.mamba-selective-state-space");
    if (!source) {
      throw new Error(
        "expected module.mamba-selective-state-space in registry",
      );
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(
      items.find((item) => item.registryId === "module.attention")?.href,
    ).toBe("/docs/modules/attention");
    expect(
      items.find((item) => item.registryId === "module.linear-attention")?.href,
    ).toBe("/docs/modules/linear-attention");
    expect(
      items.find((item) => item.registryId === "concept.context-window")?.href,
    ).toBe("/docs/glossary/context-window");
    expect(
      items.find(
        (item) => item.registryId === "concept.why-long-context-is-hard",
      )?.href,
    ).toBe("/docs/concepts/why-long-context-is-hard");
    expect(
      items.find((item) => item.registryId === "model.nemotron-3-super")?.href,
    ).toBe(NEMOTRON_MODEL_URL);
  });

  test("hybrid Nemotron 3 Super model page links to the canonical Mamba module", async () => {
    const page = await loadModelPage("nemotron-3-super");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(html).toContain('href="/docs/modules/mamba-selective-state-space"');
    expect(html).toContain('href="/docs/modules/mixture-of-experts"');
    expect(html).toContain('data-testid="derived-related-docs"');
    expect(html).toContain('data-testid="curated-related-docs"');
  });

  test(
    "rendered module shell exposes summary, graph, tags, citations, and related docs",
    async () => {
      const page = await loadModulePage("mamba-selective-state-space");
      const html = renderModuleDocsShell(page);

      expect(html).toContain("Mamba Selective State-Space Module");
      expect(html).toContain("At a glance");
      expect(html).toContain(
        `data-graph-id="${MAMBA_SELECTIVE_STATE_SPACE_GRAPH_ID}"`,
      );
      expect(html).toContain('data-testid="tag-pill-list"');
      expect(html).toContain('href="/tags/state-space"');
      expect(html).toContain('href="/tags/context-window"');
      expect(html).toContain('data-testid="citation-list"');
      expect(html).toContain('data-testid="curated-related-docs"');
      expect(html).toContain('href="/docs/modules/attention"');
      expect(html).toContain('href="/docs/modules/linear-attention"');
      expect(html).toContain('href="/docs/models/nemotron-3-super"');
      expect(html).not.toContain("TODO");
      expect(html).not.toContain("__MISSING");
      expect(html).not.toContain("missing message");
      expect(html).not.toContain("missing asset");
    },
    { timeout: 15_000 },
  );

  test("served module page renders title, graph, tags, citations, and related docs without errors", async () => {
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
        await page.goto(`${session.baseUrl}${MAMBA_MODULE_URL}`, {
          waitUntil: "load",
        });

        await page
          .getByRole("heading", {
            name: "Mamba Selective State-Space Module",
            exact: true,
          })
          .waitFor({ state: "visible" });

        const graph = page.locator('[data-react-flow-graph="true"]');
        await graph.waitFor({ state: "visible" });
        expect(await graph.getAttribute("data-graph-id")).toBe(
          MAMBA_SELECTIVE_STATE_SPACE_GRAPH_ID,
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
          .locator('[data-testid="curated-related-docs"]')
          .first()
          .waitFor({ state: "visible" });

        const bodyText = await page.locator("article").innerText();
        expect(bodyText).not.toContain("missing message");
        expect(bodyText).not.toContain("missing asset");
        expect(bodyText).not.toContain("Draft placeholder");

        await page.close();
      }
    } finally {
      await closePlaywrightBrowserWithTimeout(browser);
      await session.cleanup();
    }
  }, 120_000);
});
