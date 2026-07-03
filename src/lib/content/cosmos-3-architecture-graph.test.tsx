import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { chromium } from "playwright";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import cosmos3Messages from "@/content/docs/models/cosmos-3/messages/en.json";
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

const MODEL_SLUG = "cosmos-3";
const GRAPH_ID = "graph.cosmos-3-architecture";
const MODEL_ROUTE = "/docs/models/cosmos-3";
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

const cosmos3Assets = {
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
    <PageMessagesProvider messages={cosmos3Messages} isDev={false}>
      <PageAssetsProvider assets={cosmos3Assets} isDev={false}>
        <RegistryGraphFlow
          assetId="architectureGraph"
          graphId={GRAPH_ID}
          alt={cosmos3Messages.assets?.architectureGraph?.alt}
        />
      </PageAssetsProvider>
    </PageMessagesProvider>,
  );
}

describe("Cosmos 3 architecture graph", () => {
  afterEach(() => {
    cleanup();
  });

  test("registry graph record exposes conditioning, reasoner, generator, and modality outputs", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    expect(graph.graphType).toBe("model-architecture");
    expect(graph.rootNodeId).toBe("video-output");
    expect(graph.nodes.length).toBeGreaterThanOrEqual(12);
    expect(graph.edges.length).toBeGreaterThanOrEqual(12);

    const nodeIds = graph.nodes.map((node) => node.id);
    expect(nodeIds).toEqual(
      expect.arrayContaining([
        "text-output",
        "image-output",
        "video-output",
        "audio-output",
        "action-output",
        "autoregressive-reasoner",
        "diffusion-generator",
        "multimodal-conditioning",
        "text-prompt",
        "image-input",
        "video-input",
        "audio-input",
      ]),
    );

    const guidanceEdge = graph.edges.find(
      (edge) => edge.id === "autoregressive-reasoner-to-diffusion-generator",
    );
    expect(guidanceEdge?.edgeKind).toBe("conditioning");
  });

  test("buildRegistryFlowGraph resolves reasoner, generator, and modality labels", () => {
    const graph = getGraphById(GRAPH_ID);
    expect(graph).toBeDefined();
    if (!graph) {
      return;
    }

    const reasonerNode = graph.nodes.find(
      (node) => node.id === "autoregressive-reasoner",
    );
    const generatorNode = graph.nodes.find(
      (node) => node.id === "diffusion-generator",
    );
    const actionOutputNode = graph.nodes.find(
      (node) => node.id === "action-output",
    );

    expect(reasonerNode?.registryId).toBe("concept.autoregressive-generation");
    expect(generatorNode?.registryId).toBe("concept.denoising-generation");
    expect(actionOutputNode?.registryId).toBe("concept.world-model");
    expect(
      resolveGraphNodeLabel(cosmos3Messages, reasonerNode?.labelKey ?? ""),
    ).toBe("Autoregressive\nReasoner");
    expect(
      resolveGraphNodeLabel(cosmos3Messages, generatorNode?.labelKey ?? ""),
    ).toBe("Diffusion-Based\nGenerator");

    const { nodes } = buildRegistryFlowGraph(graph, cosmos3Messages);
    const labels = nodes.map((node) => node.data.label);

    expect(labels).toContain("Autoregressive\nReasoner");
    expect(labels).toContain("Diffusion-Based\nGenerator");
    expect(labels).toContain("Text\nOutput");
    expect(labels).toContain("Action\nOutput");
    expect(labels).toContain("Video\nInput");
    expect(labels).toContain("Multimodal\nConditioning");
  });

  test("RegistryGraphFlow renders readable markers with message-backed alt text", () => {
    const html = renderToStaticMarkup(
      <PageMessagesProvider messages={cosmos3Messages} isDev={false}>
        <PageAssetsProvider assets={cosmos3Assets} isDev={false}>
          <RegistryGraphFlow
            assetId="architectureGraph"
            graphId={GRAPH_ID}
            alt={cosmos3Messages.assets?.architectureGraph?.alt}
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain('data-graph-node-id="autoregressive-reasoner"');
    expect(html).toContain('data-graph-node-id="diffusion-generator"');
    expect(html).toContain('data-graph-node-id="multimodal-conditioning"');
    expect(html).toContain('data-graph-node-id="action-output"');
    expect(html).toContain('data-graph-node-count="12"');
    expect(html).toContain("Autoregressive");
    expect(html).toContain("Diffusion-Based");
    expect(html).toContain("Action");
    expect(html).toContain(
      "Cosmos 3 architecture diagram showing text, image, video, and audio references encoded into multimodal conditioning",
    );
  });

  test("hydrated graph exposes reasoner, generator, and output node labels", () => {
    renderArchitectureGraph();

    expect(
      screen.getByLabelText(
        /Cosmos 3 architecture diagram showing text, image, video, and audio references encoded into multimodal conditioning/,
      ),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-graph-node-id="autoregressive-reasoner"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-graph-node-id="diffusion-generator"]'),
    ).toBeTruthy();
    expect(
      document.querySelector('[data-graph-node-id="video-output"]'),
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
      id="reasoner-node"
      class="registry-graph-flow__process-node"
      style="width: 200px; height: 72px;"
    >
      Autoregressive
Reasoner
    </div>
    <div
      id="generator-node"
      class="registry-graph-flow__process-node"
      style="width: 200px; height: 72px;"
    >
      Diffusion-Based
Generator
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

        for (const nodeId of ["reasoner-node", "generator-node"]) {
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

    expect(page.messages.sections?.architecture.body).toContain("reasoner");
    expect(page.messages.sections?.architecture.body).toContain("generator");
    expect(html).toContain('data-page-asset="architectureGraph"');
    expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
    expect(html).toContain('data-react-flow-graph="true"');
    expect(html).toContain("Autoregressive");
    expect(html).toContain("Diffusion-Based");
    expect(html).toContain("Action");
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
        expect(nodeCount).toBeGreaterThanOrEqual(12);

        await page
          .locator('[data-graph-node-id="autoregressive-reasoner"]')
          .first()
          .waitFor({ state: "attached" });
        await page
          .locator('[data-graph-node-id="diffusion-generator"]')
          .first()
          .waitFor({ state: "attached" });
        await page
          .locator('[data-graph-node-id="action-output"]')
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
