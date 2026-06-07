import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { PageAssetsProvider } from "@/features/docs/components/page-assets-context";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import { ModuleGraph } from "@/features/models/components/ModuleGraph";
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

function renderModuleGraph(assetId: "computeFlow") {
  return render(
    <PageMessagesProvider messages={gqaMessages} isDev={false}>
      <PageAssetsProvider assets={gqaAssets} isDev={false}>
        <ModuleGraph
          registryId="module.grouped-query-attention"
          assetId={assetId}
        />
      </PageAssetsProvider>
    </PageMessagesProvider>,
  );
}

describe("ModuleGraph live GQA graphs", () => {
  afterEach(() => {
    cleanup();
  });

  test("computeFlow renders an MHA/GQA comparison switcher with interactive React Flow canvas", () => {
    const { container } = renderModuleGraph("computeFlow");

    expect(
      container.querySelector('[data-attention-variant-comparison="true"]'),
    ).toBeTruthy();
    expect(container.querySelector(".react-flow")).toBeTruthy();
    expect(
      container.querySelector(".registry-graph-flow__viewport"),
    ).toBeTruthy();
    const graphWrapper = container.querySelector(
      '[data-manual-visibility-evidence="registry-graph-flow-node-contrast"]',
    );
    expect(graphWrapper).toBeTruthy();
    expect(graphWrapper?.getAttribute("style")).toContain(
      "--xy-node-color: var(--card-foreground)",
    );
    expect(graphWrapper?.getAttribute("style")).toContain(
      "--xy-node-background-color: var(--card)",
    );
    expect(graphWrapper?.getAttribute("data-graph-interaction-pan")).toBe(
      "true",
    );
    expect(graphWrapper?.getAttribute("data-graph-interaction-zoom")).toBe(
      "true",
    );
    expect(graphWrapper?.getAttribute("data-graph-interaction-editing")).toBe(
      "false",
    );
    expect(
      screen.getByRole("img", {
        name: "Multi-head attention versus grouped-query attention head-count comparison",
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Toggle MHA and GQA to compare query-head count against KV-head count on one canvas",
      ),
    ).toBeTruthy();
    expect(container.querySelectorAll("[data-graph-node-id]")).toHaveLength(3);
    expect(
      container.querySelector('[data-graph-node-id="gqa-query-heads"]'),
    ).toBeTruthy();
    expect(container.textContent).not.toContain(
      "graph.grouped-query-attention-gqa-comparison",
    );
  });
});
