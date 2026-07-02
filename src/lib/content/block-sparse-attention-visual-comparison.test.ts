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
import { BLOCK_SPARSE_ATTENTION_PAGE_DIR } from "@/lib/content/content-paths";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadModulePage } from "@/lib/content/module-page";
import { pageMessagesSchema } from "@/lib/content/schemas";

const pageDir = BLOCK_SPARSE_ATTENTION_PAGE_DIR;
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

describe("block-sparse attention visual and comparison slice (block-sparse-attention-module-page-003)", () => {
  test("local assets wire dense versus block-sparse graph variants and comparison table", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
    expect(assets.computeFlow.type).toBe("attention-variant-graph");
    if (assets.computeFlow.type === "attention-variant-graph") {
      expect(assets.computeFlow.defaultVariantId).toBe("blockSparse");
      expect(
        assets.computeFlow.variants.map((variant) => variant.variantId),
      ).toEqual(["mha", "blockSparse"]);
      expect(
        assets.computeFlow.variants.map((variant) => variant.graphId),
      ).toEqual([
        "graph.multi-head-attention-time-pattern",
        "graph.block-sparse-attention-time-block-pattern",
      ]);
    }
    expect(assets.comparisonTable.type).toBe("table");
    if (assets.comparisonTable.type === "table") {
      expect(assets.comparisonTable.tableId).toBe(
        "table.block-sparse-attention-comparison",
      );
    }
  });

  test("block-pattern graph marks selected and skipped KV blocks for teaching", () => {
    const graph = getGraphById(
      "graph.block-sparse-attention-time-block-pattern",
    );

    expect(graph).toBeDefined();
    const nodes = graph?.nodes ?? [];
    const selectedBlocks = nodes.filter(
      (node) => node.visualRole === "timeline-node",
    );
    const skippedBlocks = nodes.filter(
      (node) => node.visualRole === "timeline-node-muted",
    );

    expect(selectedBlocks.length).toBeGreaterThan(0);
    expect(skippedBlocks.length).toBeGreaterThan(0);
    expect(graph?.edges?.length).toBeLessThan(
      (selectedBlocks.length + skippedBlocks.length) * selectedBlocks.length,
    );
  });

  test("rendered page exposes block-mask math and nearby-variant comparison content", async () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const page = await loadModulePage("block-sparse-attention");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(messages.math?.gqaSchema?.formula).toContain("M_B");
    expect(messages.math?.gqaSchema?.variableDefinitions?.gi?.term).toBe("M_B");
    expect(html).toContain('data-message-block-math="math.gqaSchema.formula"');
    expect(html).toContain("M_B");
    expect(html).toContain('data-attention-variant-comparison="true"');
    expect(html).toContain('data-attention-variant-active="blockSparse"');
    expect(html).toContain(
      'data-graph-id="graph.block-sparse-attention-time-block-pattern"',
    );
    expect(html).toContain('data-graph-node-id="block-sparse-time-kv-1"');
    expect(html).toContain(
      'data-table-id="table.block-sparse-attention-comparison"',
    );
    expect(html).toContain("All n-by-n query-key pairs per head");
    expect(html).toContain("General sparse pair mask");
    expect(html).toContain("Nearby-only neighborhoods");
    expect(html).toContain("Fixed local band around each query");
    expect(html).toContain('href="/docs/modules/local-attention"');
    expect(html).not.toContain("__MISSING");
    expect(html).not.toContain("TODO");
  });
});
