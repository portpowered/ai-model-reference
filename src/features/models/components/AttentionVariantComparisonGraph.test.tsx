import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PageAssetsProvider } from "@/features/docs/components/page-assets-context";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import { AttentionVariantComparisonGraph } from "@/features/models/components/AttentionVariantComparisonGraph";
import { parsePageAssetConfig } from "@/lib/content/assets";
import { GROUPED_QUERY_ATTENTION_PAGE_DIR } from "@/lib/content/content-paths";
import { pageMessagesSchema } from "@/lib/content/schemas";

const gqaMessages = pageMessagesSchema.parse(
  JSON.parse(
    readFileSync(
      join(GROUPED_QUERY_ATTENTION_PAGE_DIR, "messages/en.json"),
      "utf8",
    ),
  ),
);

const gqaAssets = parsePageAssetConfig(
  JSON.parse(
    readFileSync(join(GROUPED_QUERY_ATTENTION_PAGE_DIR, "assets.json"), "utf8"),
  ),
);

const computeFlowAsset = gqaAssets.computeFlow;
if (computeFlowAsset?.type !== "attention-variant-graph") {
  throw new Error("Expected GQA computeFlow attention-variant-graph asset");
}
const { variants, defaultVariantId } = computeFlowAsset;

function renderComparisonGraph() {
  return render(
    <PageMessagesProvider messages={gqaMessages} isDev={false}>
      <PageAssetsProvider assets={gqaAssets} isDev={false}>
        <AttentionVariantComparisonGraph
          assetId="computeFlow"
          variants={variants}
          defaultVariantId={defaultVariantId}
          alt={gqaMessages.assets?.computeFlow?.alt}
          caption={gqaMessages.assets?.computeFlow?.caption}
        />
      </PageAssetsProvider>
    </PageMessagesProvider>,
  );
}

describe("AttentionVariantComparisonGraph", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders MHA/GQA switcher markers and default GQA head-count graph", () => {
    const { container } = renderComparisonGraph();

    expect(
      container.querySelector('[data-attention-variant-comparison="true"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-attention-variant-active="gqa"]'),
    ).toBeTruthy();
    expect(
      container.querySelectorAll("[data-attention-variant-option]").length,
    ).toBe(2);
    expect(
      container.querySelector(
        ".attention-variant-comparison-figure.flex.flex-col",
      ),
    ).toBeTruthy();
    expect(
      container.querySelector(
        ".attention-variant-comparison__controls.order-2.mt-3.md\\:order-1.md\\:mb-3.md\\:mt-0",
      ),
    ).toBeTruthy();
    expect(
      container.querySelector(
        '[data-graph-id="graph.grouped-query-attention-gqa-comparison"]',
      ),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-graph-node-id="gqa-query-heads"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-graph-node-id="gqa-kv-groups"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-head-count-role="query"]'),
    ).toBeTruthy();
    expect(container.querySelector('[data-head-count-role="kv"]')).toBeTruthy();
    expect(container.querySelector(".react-flow")).toBeTruthy();
    expect(
      screen.getByRole("tab", { name: "Multi-head", selected: false }),
    ).toBeTruthy();
    expect(
      screen.getByRole("tab", { name: "Grouped-query", selected: true }),
    ).toBeTruthy();
  });

  test("switches to MHA variant on the same React Flow canvas", () => {
    const { container } = renderComparisonGraph();

    fireEvent.click(screen.getByRole("tab", { name: "Multi-head" }));

    expect(
      container.querySelector('[data-attention-variant-active="mha"]'),
    ).toBeTruthy();
    expect(
      container.querySelector(
        '[data-graph-id="graph.multi-head-attention-mha-comparison"]',
      ),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-graph-node-id="mha-query-heads"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-graph-node-id="mha-keys-label"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-graph-node-id="mha-query-head-4"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-graph-node-id="mha-value-head-4"]'),
    ).toBeTruthy();
    expect(container.textContent).toContain("Values");
    expect(container.textContent).toContain("Queries");
    expect(
      container.querySelector('[data-graph-node-count="15"]'),
    ).toBeTruthy();
    expect(
      container.querySelector<HTMLElement>(".registry-graph-flow__viewport")
        ?.style.width,
    ).toBe("100%");
    expect(container.querySelectorAll(".react-flow").length).toBe(1);
    expect(
      screen.getByRole("tab", { name: "Multi-head", selected: true }),
    ).toBeTruthy();
  });
});
