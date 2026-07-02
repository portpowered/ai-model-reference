import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { PageAssetsProvider } from "@/features/docs/components/page-assets-context";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import { AttentionVariantComparisonGraph } from "@/features/models/components/AttentionVariantComparisonGraph";
import { parsePageAssetConfig } from "@/lib/content/assets";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { pageMessagesSchema } from "@/lib/content/schemas";

const groupedQueryAttentionPageDir = getDocsPageDir(
  "modules",
  "grouped-query-attention",
);
const gatedDeltaNetPageDir = getDocsPageDir("modules", "gated-deltanet");
const mambaPageDir = getDocsPageDir("modules", "mamba-selective-state-space");

const gqaMessages = pageMessagesSchema.parse(
  JSON.parse(
    readFileSync(
      join(groupedQueryAttentionPageDir, "messages/en.json"),
      "utf8",
    ),
  ),
);

const gqaAssets = parsePageAssetConfig(
  JSON.parse(
    readFileSync(join(groupedQueryAttentionPageDir, "assets.json"), "utf8"),
  ),
);

const computeFlowAsset = gqaAssets.computeFlow;
if (computeFlowAsset?.type !== "attention-variant-graph") {
  throw new Error("Expected GQA computeFlow attention-variant-graph asset");
}
const { variants, defaultVariantId } = computeFlowAsset;

const mambaMessages = pageMessagesSchema.parse(
  JSON.parse(readFileSync(join(mambaPageDir, "messages/en.json"), "utf8")),
);

const mambaAssets = parsePageAssetConfig(
  JSON.parse(readFileSync(join(mambaPageDir, "assets.json"), "utf8")),
);

const mambaComputeFlowAsset = mambaAssets.computeFlow;
if (mambaComputeFlowAsset?.type !== "attention-variant-graph") {
  throw new Error("Expected Mamba computeFlow attention-variant-graph asset");
}
const { variants: mambaVariants, defaultVariantId: mambaDefaultVariantId } =
  mambaComputeFlowAsset;

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

function renderGatedDeltaNetComparisonGraph() {
  const messages = pageMessagesSchema.parse(
    JSON.parse(
      readFileSync(join(gatedDeltaNetPageDir, "messages/en.json"), "utf8"),
    ),
  );
  const assets = parsePageAssetConfig(
    JSON.parse(readFileSync(join(gatedDeltaNetPageDir, "assets.json"), "utf8")),
  );
  const computeFlow = assets.computeFlow;
  if (computeFlow?.type !== "attention-variant-graph") {
    throw new Error(
      "Expected gated-deltanet computeFlow attention-variant-graph asset",
    );
  }

  return render(
    <PageMessagesProvider messages={messages} isDev={false}>
      <PageAssetsProvider assets={assets} isDev={false}>
        <AttentionVariantComparisonGraph
          assetId="computeFlow"
          variants={computeFlow.variants}
          defaultVariantId={computeFlow.defaultVariantId}
          alt={messages.assets?.computeFlow?.alt}
          caption={messages.assets?.computeFlow?.caption}
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

  test("renders graph title and compute-flow legend when messages provide them", () => {
    const { container } = renderGatedDeltaNetComparisonGraph();

    expect(
      container.querySelector(
        '[data-graph-title="graph.gated-deltanet-gdn-comparison"]',
      )?.textContent,
    ).toContain("Gated DeltaNet compute path");
    expect(
      container.querySelector(
        '[data-graph-legend="graph.gated-deltanet-gdn-comparison"]',
      ),
    ).toBeTruthy();
    expect(container.textContent).toContain("Gate decay control");
    expect(container.textContent).toContain("Projections, memory, and readout");
  });

  test("renders title and legend markers for Mamba state-flow comparison assets", () => {
    const { container } = render(
      <PageMessagesProvider messages={mambaMessages} isDev={false}>
        <PageAssetsProvider assets={mambaAssets} isDev={false}>
          <AttentionVariantComparisonGraph
            assetId="computeFlow"
            variants={mambaVariants}
            defaultVariantId={mambaDefaultVariantId}
            alt={mambaMessages.assets?.computeFlow?.alt}
            caption={mambaMessages.assets?.computeFlow?.caption}
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(
      container.querySelector(
        '[data-graph-title="graph.mamba-selective-state-space-state-flow"]',
      )?.textContent,
    ).toBe("Sequence mixing over time");
    expect(
      container.querySelector(
        '[data-graph-legend="graph.mamba-selective-state-space-state-flow"]',
      ),
    ).toBeTruthy();
    expect(container.textContent).toContain("Input-dependent update path");
    expect(container.textContent).toContain("State carried across steps");
    expect(
      container.querySelector('[data-attention-variant-active="mamba"]'),
    ).toBeTruthy();
    expect(
      container.querySelector(
        '[data-graph-id="graph.mamba-selective-state-space-state-flow"]',
      ),
    ).toBeTruthy();
  });

  test("switches to MHA variant on the Mamba comparison graph", () => {
    const { container } = render(
      <PageMessagesProvider messages={mambaMessages} isDev={false}>
        <PageAssetsProvider assets={mambaAssets} isDev={false}>
          <AttentionVariantComparisonGraph
            assetId="computeFlow"
            variants={mambaVariants}
            defaultVariantId={mambaDefaultVariantId}
            alt={mambaMessages.assets?.computeFlow?.alt}
            caption={mambaMessages.assets?.computeFlow?.caption}
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Multi-head" }));

    expect(
      container.querySelector('[data-attention-variant-active="mha"]'),
    ).toBeTruthy();
    expect(
      container.querySelector(
        '[data-graph-id="graph.multi-head-attention-time-pattern"]',
      ),
    ).toBeTruthy();
    expect(
      container.querySelector(
        '[data-graph-title="graph.multi-head-attention-time-pattern"]',
      ),
    ).toBeTruthy();
  });

  test("renders missing label state in dev mode", () => {
    const { container } = render(
      <PageMessagesProvider
        messages={{
          title: "Mamba Selective State-Space Module",
          description: "test",
        }}
        isDev
      >
        <PageAssetsProvider assets={mambaAssets} isDev>
          <AttentionVariantComparisonGraph
            assetId="computeFlow"
            variants={mambaVariants}
            defaultVariantId={mambaDefaultVariantId}
            isDev
          />
        </PageAssetsProvider>
      </PageMessagesProvider>,
    );

    expect(container.textContent).toContain("assets.computeFlow.variants");
  });
});
