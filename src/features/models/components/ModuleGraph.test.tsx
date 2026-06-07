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

function renderModuleGraph(assetId: "computeFlow" | "computeSchema") {
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

  test("computeFlow renders an interactive React Flow canvas with message-driven copy", () => {
    const { container } = renderModuleGraph("computeFlow");

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
    expect(
      screen.getByRole("img", {
        name: "Grouped-query attention compute flow",
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Query groups route to shared KV heads during attention",
      ),
    ).toBeTruthy();
    expect(container.querySelectorAll("[data-graph-node-id]")).toHaveLength(6);
    expect(container.textContent).not.toContain(
      "graph.grouped-query-attention-compute-flow",
    );
  });

  test("computeSchema renders an interactive React Flow canvas with message-driven copy", () => {
    const { container } = renderModuleGraph("computeSchema");

    expect(container.querySelector(".react-flow")).toBeTruthy();
    expect(
      container.querySelector(".registry-graph-flow__viewport"),
    ).toBeTruthy();
    expect(
      screen.getByRole("img", {
        name: "Grouped-query attention tensor grouping",
      }),
    ).toBeTruthy();
    expect(
      screen.getByText("H query heads map to G shared KV groups"),
    ).toBeTruthy();
    expect(container.querySelectorAll("[data-graph-node-id]")).toHaveLength(5);
    expect(container.textContent).not.toContain(
      "graph.grouped-query-attention-compute-schema",
    );
  });
});
