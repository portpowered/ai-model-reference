/**
 * Focused GPU system page rendering and graph contracts.
 * Routine bundle invariants stay on `make validate-data` and
 * `gpu-system-slice-verification.test.ts`.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ReactElement } from "react";
import { renderToReadableStream } from "react-dom/server";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { SystemFlowGraph } from "@/features/models/components/SystemFlowGraph";
import {
  parsePageAssetConfig,
  validatePageAssetReferences,
} from "@/lib/content/assets";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import { getSystemById } from "@/lib/content/registry-runtime";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { loadSystemPage } from "@/lib/content/system-page";
import { renderSystemDocsShell } from "@/lib/content/system-shell-render";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";
import {
  closePlaywrightBrowserWithTimeout,
  launchPlaywrightBrowser,
} from "@/lib/verify/launch-playwright-browser";
import {
  acquireVerifyServerSession,
  shouldRunVerifyProductionIntegrationTests,
} from "@/lib/verify/server-lifecycle";

const pageDir = getDocsPageDir("systems", "gpu");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");
const GPU_SYSTEM_ROUTE = "/docs/systems/gpu";
const PAGE_CONTRACT_TIMEOUT_MS = 15_000;
const repoRoot = join(import.meta.dir, "../../..");

async function renderAsyncMarkup(element: ReactElement): Promise<string> {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return await new Response(stream).text();
}

describe("gpu canonical page bundle", () => {
  test("published route, registry record, English messages, and search document stay aligned", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const page = await loadSystemPage("gpu");
    const bundledMessages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const record = getSystemById("system.gpu");

    expect(record?.slug).toBe("gpu");
    expect(page.frontmatter.registryId).toBe("system.gpu");
    expect(page.frontmatter.kind).toBe("system");
    expect(page.messages.title).toBe(bundledMessages.title);
    expect(page.messages.openingSummary).toBe(bundledMessages.openingSummary);
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has("system.gpu")).toBe(true);

    const publishedPage = pages.find(
      (entry) => entry.docsSlug === "systems/gpu",
    );
    expect(publishedPage?.url).toBe("/docs/systems/gpu");
    expect(publishedPage?.frontmatter.registryId).toBe("system.gpu");

    const searchDocument = buildSearchDocuments(pages, registry).find(
      (entry) => entry.url === "/docs/systems/gpu",
    );
    expect(searchDocument?.registryId).toBe("system.gpu");
    expect(searchDocument?.kind).toBe("system");
    expect(searchDocument?.title).toBe(bundledMessages.title);
    expect(searchDocument?.aliases).toEqual(
      expect.arrayContaining(["graphics processing unit", "AI accelerator"]),
    );
    expect(searchDocument?.tags).toEqual([
      "foundations",
      "hardware-distributed",
    ]);
    expect(searchDocument?.relatedIds).toEqual(record?.relatedIds ?? []);
  });

  test.each([
    "GPU",
    "graphics processing unit",
    "AI accelerator",
  ] as const)("%s query resolves to the canonical GPU system page", async (query) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((result) => result.url === "/docs/systems/gpu")).toBe(
      true,
    );
  });

  test("loads the system page with the expected section structure and local graph assets", async () => {
    const page = await loadSystemPage("gpu");

    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.toc.some((item) => item.url === "#how-it-works")).toBe(true);
    expect(page.toc.some((item) => item.url === "#practical-impact")).toBe(
      true,
    );
    expect(page.assets.systemFlow).toMatchObject({
      graphId: "graph.gpu-system-flow",
      webRenderer: "react-flow",
    });
    expect(page.messages.sections?.whatItIs?.body).toContain(
      "parallel hardware",
    );
    expect(page.messages.sections?.whatItIs?.body).toContain(
      "dense matrix multiplications",
    );
    expect(page.messages.sections?.whereItSits?.body).toContain(
      "inference engine",
    );
    expect(page.messages.sections?.howItWorks?.body).toContain(
      "video random access memory",
    );
    expect(page.messages.sections?.howItWorks?.body).toContain(
      "Memory bandwidth",
    );
    expect(page.messages.sections?.howItWorks?.body).toContain(
      "key-value cache",
    );
    expect(page.messages.sections?.howItWorks?.body).toContain("tensor cores");
    expect(page.messages.sections?.practicalImpact?.body).toContain("VRAM");
    expect(page.messages.sections?.practicalImpact?.body).toContain(
      "memory bandwidth cannot feed the cores",
    );
    expect(page.messages.sections?.practicalImpact?.body).toContain(
      "raise throughput",
    );
    expect(page.messages.sections?.practicalImpact?.body).toContain(
      "wait in queue for batch formation",
    );
    expect(page.messages.sections?.practicalImpact?.body).toContain(
      "first-token or inter-token latency",
    );
    expect(page.messages.sections?.practicalImpact?.body).toContain(
      "Kernel optimization",
    );
    expect(page.messages.sections?.practicalImpact?.body).toContain(
      "not which product to buy today",
    );
    expect(page.messages.sections?.related?.body).toContain("inference engine");
    expect(page.messages.sections?.related?.body).toContain(
      "deployment placement",
    );
    expect(page.messages.sections?.related?.body).toContain(
      "roofline reasoning",
    );
    expect(page.messages.assets?.systemFlow?.alt).toContain("parallel cores");
    expect(page.messages.assets?.systemFlow?.caption).toContain(
      "memory bandwidth",
    );
    expect(page.messages.openingSummary).toContain("graphics processing unit");
    expect(getGraphById("graph.gpu-system-flow")?.subjectId).toBe("system.gpu");
    expect(getGraphById("graph.gpu-system-flow")?.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "parallelCores",
          size: expect.objectContaining({ width: 250 }),
        }),
        expect.objectContaining({
          id: "tensorCores",
          size: expect.objectContaining({ width: 260 }),
        }),
      ]),
    );
  });
});

describe("gpu docs route render", () => {
  test("renders the system shell with a folded opening summary", async () => {
    const page = await loadSystemPage("gpu");
    const html = await renderSystemDocsShell(page);

    expect(html).toContain('data-testid="folded-opening-summary"');
    expect(html).toContain("Opening summary");
    expect(html).toContain("graphics processing unit");
    expect(html).toContain("At a glance");
  });

  test("renders the canonical content with related docs, tags, and citations", async () => {
    const page = await loadSystemPage("gpu");
    const html = await renderAsyncMarkup(
      createElement(
        ModulePageProviders,
        {
          messages: page.messages,
          assets: page.assets,
        },
        page.content,
      ),
    );

    expect(html).toContain('href="/docs/concepts/memory-bandwidth"');
    expect(html).toContain('href="/docs/concepts/roofline-model"');
    expect(html).toContain('href="/docs/concepts/quantization"');
    expect(html).toContain('href="/docs/concepts/flops"');
    expect(html).toContain('href="/docs/systems/inference-engine"');
    expect(html).toContain('href="/docs/systems/batching"');
    expect(html).toContain('href="/docs/systems/deployment"');
    expect(html).toContain('href="/docs/systems/memory"');
    expect(html).toContain('href="/tags/foundations"');
    expect(html).toContain('href="/tags/hardware-distributed"');
    expect(html).toContain("tensor cores");
    expect(html).toContain("VRAM");
    expect(html).toContain("dense matrix");
    expect(html).toContain("raise throughput");
    expect(html).toContain("wait in queue for batch formation");
    expect(html).toContain("deployment placement");
    expect(html).toContain('href="/docs/concepts/roofline-model"');
    expect(html).toContain("Kernel optimization");
    expect(html).toContain("not which product to buy today");
    expect(html).toContain('data-testid="curated-related-docs"');
  });

  test("renders the GPU system flow graph with the page-local graph asset", async () => {
    const page = await loadSystemPage("gpu");
    const html = await renderAsyncMarkup(
      createElement(
        ModulePageProviders,
        {
          messages: page.messages,
          assets: page.assets,
        },
        createElement(SystemFlowGraph, {
          registryId: "system.gpu",
          assetId: "systemFlow",
        }),
      ),
    );

    expect(html).toContain('data-graph-title="graph.gpu-system-flow"');
    expect(html).toContain("Thousands of parallel cores");
    expect(html).toContain("Dense matrix and vector math");
    expect(html).toContain("VRAM capacity and memory bandwidth");
    expect(html).toContain("Tensor cores accelerate matrix blocks");
  });

  test(
    "served GPU page renders relationship section and related-doc surface at desktop and mobile widths",
    async () => {
      if (!shouldRunVerifyProductionIntegrationTests(repoRoot)) {
        return;
      }

      const session = await acquireVerifyServerSession({
        projectRoot: repoRoot,
      });
      const browser = await launchPlaywrightBrowser();

      try {
        for (const viewport of [
          { width: 1280, height: 800 },
          { width: 375, height: 667 },
        ]) {
          const page = await browser.newPage({ viewport });
          page.setDefaultTimeout(30_000);
          await page.goto(`${session.baseUrl}${GPU_SYSTEM_ROUTE}`, {
            waitUntil: "load",
          });

          await page
            .getByRole("heading", { name: "GPU", exact: true })
            .waitFor({ state: "visible" });

          await page.locator("#related").waitFor({ state: "visible" });
          await page
            .locator('[data-testid="curated-related-docs"]')
            .first()
            .waitFor({ state: "visible" });

          const relatedSection = page.locator("#related");
          await relatedSection
            .getByRole("link", { name: /inference engine/i })
            .first()
            .waitFor({ state: "visible" });
          await relatedSection
            .getByRole("link", { name: /roofline model/i })
            .first()
            .waitFor({ state: "visible" });
          await relatedSection
            .getByRole("link", { name: /memory bandwidth/i })
            .first()
            .waitFor({ state: "visible" });

          const bodyText = await page.locator("article").innerText();
          expect(bodyText).toContain("raise throughput");
          expect(bodyText).toContain("wait in queue for batch formation");
          expect(bodyText).not.toContain("missing message");
          expect(bodyText).not.toContain("missing asset");

          await page.close();
        }
      } finally {
        await closePlaywrightBrowserWithTimeout(browser);
        await session.cleanup();
      }
    },
    { timeout: PAGE_CONTRACT_TIMEOUT_MS },
  );
});

describe("gpu page assets", () => {
  test("accepts the page's local graph asset config", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.systemFlow).toMatchObject({
      type: "graph",
      graphId: "graph.gpu-system-flow",
    });
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});
