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
const repoRoot = join(import.meta.dir, "../../../../..");

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

  test("registry graph record exposes multimodal inputs, backbone, and MoE path", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    expect(graph.graphType).toBe("model-architecture");
    expect(graph.rootNodeId).toBe("output-probabilities");
    expect(graph.nodes.length).toBeGreaterThanOrEqual(17);
    expect(graph.edges.length).toBeGreaterThanOrEqual(14);

    const nodeIds = graph.nodes.map((node) => node.id);
    expect(nodeIds).toEqual(
      expect.arrayContaining([
        "text-input",
        "image-input",
        "audio-input",
        "multimodal-encoding",
        "long-context-attention",
        "moe-routing",
        "output-probabilities",
      ]),
    );
  });

  test("buildRegistryFlowGraph resolves multimodal and MoE labels", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const multimodalNode = graph.nodes.find(
      (node) => node.id === "multimodal-encoding",
    );
    const attentionNode = graph.nodes.find(
      (node) => node.id === "long-context-attention",
    );
    const moeNode = graph.nodes.find((node) => node.id === "moe-routing");

    expect(multimodalNode?.registryId).toBe("concept.multimodal-model");
    expect(attentionNode?.registryId).toBe("concept.context-window");
    expect(moeNode?.registryId).toBe("module.mixture-of-experts");
    expect(
      resolveGraphNodeLabel(gemmaMessages, multimodalNode?.labelKey ?? ""),
    ).toBe("Multimodal\nEncoding");
    expect(
      resolveGraphNodeLabel(gemmaMessages, attentionNode?.labelKey ?? ""),
    ).toBe("Long-Context\nAttention");

    const { nodes } = buildRegistryFlowGraph(graph, gemmaMessages);
    const labels = nodes.map((node) => node.data.label);

    expect(labels).toContain("Multimodal\nEncoding");
    expect(labels).toContain("Long-Context\nAttention");
    expect(labels).toContain("MoE or\nDense FFN");
    expect(labels).toContain("Text\nInput");
    expect(labels).toContain("Image\nInput");
    expect(labels).toContain("Audio\nInput");
  });

  test("RegistryGraphFlow renders readable markers with message-backed alt text", () => {
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
    expect(html).toContain('data-graph-node-id="multimodal-encoding"');
    expect(html).toContain('data-graph-node-id="long-context-attention"');
    expect(html).toContain('data-graph-node-id="moe-routing"');
    expect(html).toContain('data-graph-node-id="text-input"');
    expect(html).toContain("Multimodal");
    expect(html).toContain("Long-Context");
    expect(html).toContain(
      "Gemma 4 architecture diagram showing text, image, and audio inputs encoded into a shared multimodal backbone",
    );
  });

  test("hydrated graph exposes multimodal and MoE node labels", () => {
    renderArchitectureGraph();

    expect(
      screen.getByLabelText(
        /Gemma 4 architecture diagram showing text, image, and audio inputs encoded into a shared multimodal backbone/,
      ),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-graph-node-id="multimodal-encoding"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-graph-node-id="long-context-attention"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-graph-node-id="moe-routing"]'),
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
      id="multimodal-node"
      class="registry-graph-flow__process-node"
      style="width: 210px; height: 62px;"
    >
      Multimodal
Encoding
    </div>
    <div
      id="attention-node"
      class="registry-graph-flow__process-node"
      style="width: 230px; height: 82px;"
    >
      Long-Context
Attention
    </div>
    <div
      id="moe-node"
      class="registry-graph-flow__process-node"
      style="width: 230px; height: 82px;"
    >
      MoE or
Dense FFN
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

        for (const nodeId of [
          "multimodal-node",
          "attention-node",
          "moe-node",
        ]) {
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
      "architecture graph below",
    );
    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain("Multimodal");
    expect(html).toContain("Long-Context");
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
        expect(nodeCount).toBeGreaterThanOrEqual(17);

        await page
          .locator('[data-graph-node-id="multimodal-encoding"]')
          .first()
          .waitFor({ state: "attached" });
        await page
          .locator('[data-graph-node-id="long-context-attention"]')
          .first()
          .waitFor({ state: "attached" });
        await page
          .locator('[data-graph-node-id="moe-routing"]')
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
