import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { chromium } from "playwright";
import { renderToStaticMarkup } from "react-dom/server";
import { PageAssetsProvider } from "@/features/docs/components/page-assets-context";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import { RegistryGraphFlow } from "@/features/models/components/RegistryGraphFlow";
import { buildRegistryFlowGraph } from "@/lib/content/graph-flow";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import type { PageAssetConfig, PageMessages } from "@/lib/content/schemas";
import { pageMessagesSchema } from "@/lib/content/schemas";
import {
  closePlaywrightBrowserWithTimeout,
  launchPlaywrightBrowser,
  resolvePlaywrightChromiumExecutablePath,
} from "@/lib/verify/launch-playwright-browser";
import {
  acquireVerifyServerSession,
  shouldRunVerifyProductionIntegrationTests,
} from "@/lib/verify/server-lifecycle";

const GRAPH_ID = "graph.nemotron-3-super-architecture";
const MODEL_PAGE_DIR = "src/content/docs/models/nemotron-3-super";
const MODEL_ROUTE = "/docs/models/nemotron-3-super";
const repoRoot = join(import.meta.dir, "../../..");

function canLaunchPlaywrightChromium(): boolean {
  const executablePath = resolvePlaywrightChromiumExecutablePath();
  if (executablePath) {
    return existsSync(executablePath);
  }

  try {
    return existsSync(chromium.executablePath());
  } catch {
    return false;
  }
}

const nemotronMessages = pageMessagesSchema.parse(
  JSON.parse(readFileSync(join(MODEL_PAGE_DIR, "messages/en.json"), "utf8")),
);

const nemotronAssets = {
  architectureGraph: {
    type: "graph",
    graphId: GRAPH_ID,
    webRenderer: "react-flow",
    printRenderer: "vertical-svg",
    altKey: "assets.architectureGraph.alt",
  },
} satisfies PageAssetConfig;

function renderArchitectureGraph() {
  return render(
    <PageMessagesProvider messages={nemotronMessages} isDev={false}>
      <PageAssetsProvider assets={nemotronAssets} isDev={false}>
        <RegistryGraphFlow
          assetId="architectureGraph"
          graphId={GRAPH_ID}
          alt={nemotronMessages.assets?.architectureGraph?.alt}
        />
      </PageAssetsProvider>
    </PageMessagesProvider>,
  );
}

describe("nemotron 3 super architecture graph", () => {
  afterEach(() => {
    cleanup();
  });

  test("registry graph record exposes hybrid sequence and MoE nodes with flow edges", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    expect(graph.graphType).toBe("model-architecture");
    expect(graph.rootNodeId).toBe("output-probabilities");
    expect(graph.nodes.length).toBeGreaterThanOrEqual(14);
    expect(graph.edges.length).toBeGreaterThanOrEqual(10);

    const nodeIds = graph.nodes.map((node) => node.id);
    expect(nodeIds).toEqual(
      expect.arrayContaining([
        "input-tokens",
        "hybrid-sequence",
        "mixture-of-experts",
        "output-probabilities",
        "repeat-marker",
      ]),
    );
  });

  test("buildRegistryFlowGraph resolves hybrid sequence and MoE semantics", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const { nodes, edges } = buildRegistryFlowGraph(
      graph,
      nemotronMessages as PageMessages,
    );

    expect(nodes.length).toBeGreaterThanOrEqual(14);
    expect(edges.length).toBeGreaterThanOrEqual(10);

    const hybridNode = nodes.find((node) => node.id === "hybrid-sequence");
    const moeNode = nodes.find((node) => node.id === "mixture-of-experts");
    const inputTokensNode = nodes.find((node) => node.id === "input-tokens");

    expect(hybridNode?.data.semantic).toMatchObject({
      interactionKind: "graph-local",
      relatedPageHref: "/docs/modules/multi-head-attention",
      summarySource: "graph-local",
    });
    expect(hybridNode?.data.semantic.resolvedTitle).toContain("Hybrid");
    expect(hybridNode?.data.semantic.resolvedTitle).toContain("Attention");
    expect(moeNode?.data.semantic).toMatchObject({
      registryId: "module.mixture-of-experts",
      entityKind: "module",
      hasCanonicalPage: true,
      canonicalPageHref: "/docs/modules/mixture-of-experts",
    });
    expect(moeNode?.data.semantic.resolvedTitle).toContain("LatentMoE");
    expect(inputTokensNode?.data.semantic).toMatchObject({
      registryId: "concept.token",
    });
    expect(inputTokensNode?.data.semantic.resolvedTitle).toContain("Input");
    expect(nodes.map((node) => node.data.label)).toContain("N×");
  });

  test("RegistryGraphFlow renders readable markers for the architecture graph", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={nemotronMessages} isDev={false}>
        <PageAssetsProvider assets={nemotronAssets} isDev={false}>
          <RegistryGraphFlow
            assetId="architectureGraph"
            graphId={GRAPH_ID}
            alt={nemotronMessages.assets?.architectureGraph?.alt}
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain('data-graph-node-id="hybrid-sequence"');
    expect(html).toContain('data-graph-node-id="mixture-of-experts"');
    expect(html).toContain('data-graph-node-id="input-tokens"');
    expect(html).toContain('data-graph-node-count="15"');
    expect(html).toContain("Hybrid");
    expect(html).toContain("LatentMoE");
    expect(html).toContain("Input");
    expect(html).toContain(
      "Nemotron 3 Super architecture diagram showing input tokens flowing through hybrid Mamba-attention sequence blocks, sparse Mixture-of-Experts routing, and output generation.",
    );
  });

  test("hydrated graph exposes hybrid and MoE node labels in the client render", () => {
    renderArchitectureGraph();

    expect(
      screen.getByLabelText(
        /Nemotron 3 Super architecture diagram showing input tokens flowing through hybrid Mamba-attention sequence blocks/,
      ),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-graph-node-id="hybrid-sequence"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-graph-node-id="mixture-of-experts"]'),
    ).toBeTruthy();
    expect(document.querySelector(".react-flow__node")).toBeTruthy();
  });

  test("graph node labels stay within declared boxes at desktop and mobile widths", async () => {
    if (!canLaunchPlaywrightChromium()) {
      return;
    }

    const css = readFileSync(
      join(repoRoot, "src/features/docs/styles/registry-graph-flow-theme.css"),
      "utf8",
    );
    const fixtureHtml = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>${css}</style>
  </head>
  <body>
    <div
      id="hybrid-node"
      class="registry-graph-flow__process-node"
      style="width: 230px; height: 82px;"
    >
      Hybrid
Mamba +
Attention
    </div>
    <div
      id="moe-node"
      class="registry-graph-flow__process-node"
      style="width: 230px; height: 82px;"
    >
      LatentMoE
Experts
    </div>
  </body>
</html>`;

    const browser = await launchPlaywrightBrowser();

    try {
      for (const viewport of [
        { width: 1280, height: 800, name: "desktop" },
        { width: 375, height: 667, name: "mobile" },
      ]) {
        const page = await browser.newPage({ viewport });
        await page.setContent(fixtureHtml, { waitUntil: "domcontentloaded" });

        for (const nodeId of ["hybrid-node", "moe-node"]) {
          const metrics = await page.evaluate((id) => {
            const element = document.getElementById(id);
            if (!element) {
              throw new Error(`missing node ${id}`);
            }
            return {
              clientHeight: element.clientHeight,
              scrollHeight: element.scrollHeight,
              clientWidth: element.clientWidth,
              scrollWidth: element.scrollWidth,
            };
          }, nodeId);

          expect(metrics.scrollHeight).toBeLessThanOrEqual(
            metrics.clientHeight + 1,
          );
          expect(metrics.scrollWidth).toBeLessThanOrEqual(
            metrics.clientWidth + 1,
          );
        }

        await page.close();
      }
    } finally {
      await closePlaywrightBrowserWithTimeout(browser);
    }
  }, 120_000);

  test("served model page exposes the architecture graph at desktop and mobile widths", async () => {
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
        await page.goto(`${session.baseUrl}${MODEL_ROUTE}`, {
          waitUntil: "load",
        });

        const graph = page.locator('[data-react-flow-graph="true"]');
        await graph.waitFor({ state: "visible" });
        expect(await graph.getAttribute("data-graph-id")).toBe(GRAPH_ID);

        const nodeCount = Number(
          (await graph.getAttribute("data-graph-node-count")) ?? "0",
        );
        expect(nodeCount).toBeGreaterThanOrEqual(14);

        await page
          .locator('[data-graph-node-id="hybrid-sequence"]')
          .first()
          .waitFor({ state: "attached" });
        await page
          .locator('[data-graph-node-id="mixture-of-experts"]')
          .first()
          .waitFor({ state: "attached" });

        await page.close();
      }
    } finally {
      await closePlaywrightBrowserWithTimeout(browser);
      await session.cleanup();
    }
  }, 120_000);
});
