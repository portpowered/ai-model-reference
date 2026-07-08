import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { chromium } from "playwright";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import gemmaMessages from "@/content/docs/models/gemma/messages/en.json";
import { ModulePageProviders } from "@/features/docs/components/ModulePageProviders";
import { PageAssetsProvider } from "@/features/docs/components/page-assets-context";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import { RegistryGraphFlow } from "@/features/models/components/RegistryGraphFlow";
import {
  buildRegistryFlowGraph,
  resolveGraphNodeLabel,
} from "@/lib/content/graph-flow";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadModelPage } from "@/lib/content/model-page";
import type { PageAssetConfig } from "@/lib/content/schemas";
import {
  closePlaywrightBrowserWithTimeout,
  launchPlaywrightBrowser,
  resolvePlaywrightChromiumExecutablePath,
} from "@/lib/verify/launch-playwright-browser";
import {
  acquireVerifyServerSession,
  shouldRunVerifyProductionIntegrationTests,
} from "@/lib/verify/server-lifecycle";

const MODEL_SLUG = "gemma";
const GRAPH_ID = "graph.gemma-architecture";
const MODEL_ROUTE = "/docs/models/gemma";
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

const gemmaAssets = {
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
    <PageMessagesProvider messages={gemmaMessages} isDev={false}>
      <PageAssetsProvider assets={gemmaAssets} isDev={false}>
        <RegistryGraphFlow
          assetId="architectureGraph"
          graphId={GRAPH_ID}
          alt={gemmaMessages.assets?.architectureGraph?.alt}
        />
      </PageAssetsProvider>
    </PageMessagesProvider>,
  );
}

describe("Gemma architecture graph", () => {
  afterEach(() => {
    cleanup();
  });

  test("registry graph record exposes multimodal inputs, long-context attention, and dense or MoE feed-forward nodes", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    expect(graph.graphType).toBe("model-architecture");
    expect(graph.rootNodeId).toBe("text-output");
    expect(graph.nodes.length).toBeGreaterThanOrEqual(14);
    expect(graph.edges.length).toBeGreaterThanOrEqual(10);

    const nodeIds = graph.nodes.map((node) => node.id);
    expect(nodeIds).toEqual(
      expect.arrayContaining([
        "text-prompt",
        "image-input",
        "audio-input",
        "multimodal-fusion",
        "long-context-attention",
        "feed-forward-path",
        "text-output",
        "repeat-marker",
      ]),
    );
  });

  test("buildRegistryFlowGraph resolves multimodal fusion and dense-or-MoE semantics", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const fusionNode = graph.nodes.find(
      (node) => node.id === "multimodal-fusion",
    );
    const attentionNode = graph.nodes.find(
      (node) => node.id === "long-context-attention",
    );
    const ffnNode = graph.nodes.find((node) => node.id === "feed-forward-path");

    expect(fusionNode?.registryId).toBe("concept.multimodal-model");
    expect(attentionNode?.registryId).toBe("concept.context-window");
    expect(ffnNode?.registryId).toBe("module.mixture-of-experts");
    expect(
      resolveGraphNodeLabel(gemmaMessages, fusionNode?.labelKey ?? ""),
    ).toBe("Multimodal\nFusion");
    expect(
      resolveGraphNodeLabel(gemmaMessages, attentionNode?.labelKey ?? ""),
    ).toBe("Long-Context\nAttention");
    expect(resolveGraphNodeLabel(gemmaMessages, ffnNode?.labelKey ?? "")).toBe(
      "Dense FFN\nor MoE",
    );

    const { nodes } = buildRegistryFlowGraph(graph, gemmaMessages);
    const labels = nodes.map((node) => node.data.label);

    expect(labels).toContain("Multimodal\nFusion");
    expect(labels).toContain("Long-Context\nAttention");
    expect(labels).toContain("Dense FFN\nor MoE");
    expect(labels).toContain("N×");
  });

  test("RegistryGraphFlow renders readable multimodal and feed-forward markers with message-backed alt text", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={gemmaMessages} isDev={false}>
        <PageAssetsProvider assets={gemmaAssets} isDev={false}>
          <RegistryGraphFlow
            assetId="architectureGraph"
            graphId={GRAPH_ID}
            alt={gemmaMessages.assets?.architectureGraph?.alt}
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain('data-graph-node-id="multimodal-fusion"');
    expect(html).toContain('data-graph-node-id="long-context-attention"');
    expect(html).toContain('data-graph-node-id="feed-forward-path"');
    expect(html).toContain('data-graph-node-id="text-prompt"');
    expect(html).toContain("Multimodal");
    expect(html).toContain("Long-Context");
    expect(html).toContain("Dense FFN");
    expect(html).toContain(
      "Gemma 4 architecture diagram showing text, image, and audio inputs fused into a shared multimodal backbone",
    );
  });

  test("hydrated graph exposes multimodal fusion and feed-forward labels", () => {
    renderArchitectureGraph();

    expect(
      screen.getByLabelText(
        /Gemma 4 architecture diagram showing text, image, and audio inputs fused into a shared multimodal backbone/,
      ),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-graph-node-id="multimodal-fusion"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-graph-node-id="feed-forward-path"]'),
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
      id="fusion-node"
      class="registry-graph-flow__process-node"
      style="width: 250px; height: 72px;"
    >
      Multimodal
Fusion
    </div>
    <div
      id="ffn-node"
      class="registry-graph-flow__process-node"
      style="width: 230px; height: 82px;"
    >
      Dense FFN
or MoE
    </div>
  </body>
</html>`;

    const browser = await launchPlaywrightBrowser();

    try {
      for (const viewport of [
        { width: 1280, height: 800 },
        { width: 375, height: 667 },
      ]) {
        const page = await browser.newPage({ viewport });
        await page.setContent(fixtureHtml, { waitUntil: "domcontentloaded" });

        for (const nodeId of ["fusion-node", "ffn-node"]) {
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

  test("model page architecture section renders the registry-backed graph surface", async () => {
    const page = await loadModelPage(MODEL_SLUG);
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(page.messages.sections?.architecture.body).toContain(
      "multimodal architecture",
    );
    expect(page.messages.sections?.architecture.body).toContain(
      "mixture of experts",
    );
    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain("Multimodal");
    expect(html).toContain("Long-Context");
    expect(html).toContain("Dense FFN");
  });

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
          .locator('[data-graph-node-id="multimodal-fusion"]')
          .first()
          .waitFor({ state: "attached" });
        await page
          .locator('[data-graph-node-id="feed-forward-path"]')
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
