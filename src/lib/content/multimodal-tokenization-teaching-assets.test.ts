/**
 * Teaching-asset verification for the multimodal tokenization module page.
 * Proves graph/table labels, values, and alt text resolve from colocated messages.
 */
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
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadModulePage } from "@/lib/content/module-page";
import { pageMessagesSchema } from "@/lib/content/schemas";

const SLUG = "multimodal-tokenization";
const GRAPH_ID = "graph.multimodal-tokenization-compute-flow";
const TABLE_ID = "table.multimodal-tokenization-comparison";

const pageDir = getDocsPageDir("modules", SLUG);
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

async function renderMultimodalTokenizationPageHtml(): Promise<string> {
  const page = await loadModulePage(SLUG);
  return renderToStaticMarkup(
    createElement(ModulePageProviders, {
      messages: page.messages,
      assets: page.assets,
      // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
      children: page.content,
    }),
  );
}

describe("multimodal tokenization teaching assets (multimodal-tokenization-module-page-004)", () => {
  test("page-local assets resolve graph and table references from colocated messages", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.computeFlow).toMatchObject({
      type: "graph",
      graphId: GRAPH_ID,
      webRenderer: "react-flow",
      altKey: "assets.computeFlow.alt",
    });
    expect(assets.comparisonTable).toMatchObject({
      type: "table",
      tableId: TABLE_ID,
    });
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
    expect(messages.assets?.computeFlow?.title).toBe(
      "Multimodal input to shared sequence",
    );
    expect(messages.assets?.computeFlow?.legend?.["data-flow"]?.label).toBe(
      "Modality encoding and fusion path",
    );
    expect(messages.tables?.comparison?.dimensions?.inputForm).toBe(
      "Input form",
    );
    expect(messages.tables?.comparison?.values?.videoTokens?.outputForm).toBe(
      "Patch or clip embeddings repeated across time",
    );
  });

  test(
    "rendered graph and comparison table expose message-backed modality teaching copy",
    async () => {
      const html = await renderMultimodalTokenizationPageHtml();

      expect(html).toContain(`data-graph-id="${GRAPH_ID}"`);
      expect(html).toContain(`data-table-id="${TABLE_ID}"`);
      expect(html).toContain("Multimodal input to shared sequence");
      expect(html).toContain("Modality encoding and fusion path");
      expect(html).toContain("Raw modality inputs");
      expect(html).toContain("Split into patches, frames, or clips");
      expect(html).toContain("Align widths with modality adapters");
      expect(html).toContain("Token-like embedding vectors");
      expect(html).toContain("Shared model sequence");
      expect(html).toContain('data-graph-node-id="raw-inputs"');
      expect(html).toContain('data-graph-node-id="shared-sequence"');
      expect(html).toContain("Input form");
      expect(html).toContain("Ordering and time");
      expect(html).toContain("Unicode text strings");
      expect(html).toContain("learned text vocabulary");
      expect(html).toContain("continuous embedding");
      expect(html).toContain("short time frame or feature step");
      expect(html).toContain(
        'data-comparison-cell="outputForm:concept.visual-tokenization"',
      );
      expect(html).toContain("repeated across time");
      expect(html).toContain(
        'data-comparison-cell="outputForm:concept.modality"',
      );
      expect(html).toContain(
        'data-comparison-cell="mainTradeoff:module.multimodal-tokenization"',
      );
      expect(html).toContain('href="/docs/glossary/hidden-size"');
      expect(html).toContain('data-math-schema="modalityUnitSplit"');
    },
    { timeout: 15_000 },
  );
});
