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
import { expectGlossaryBodyOmitsTitleHeading } from "@/lib/content/glossary-test-helpers";
import { loadModulePage } from "@/lib/content/module-page";
import { pageMessagesSchema } from "@/lib/content/schemas";
import {
  assertMambaSelectiveStateSpaceGraphPresentationConvergence,
  assertMambaSelectiveStateSpaceGraphThemeConvergence,
  assertMambaSelectiveStateSpaceMathDefinitionsConvergence,
  assertMambaSelectiveStateSpaceModuleConvergence,
  assertMambaSelectiveStateSpaceSingleGraphConvergence,
  MAMBA_SELECTIVE_STATE_SPACE_GRAPH_ID,
  MAMBA_SELECTIVE_STATE_SPACE_SSM_MATH_VARIABLE_DEFINITION_IDS,
} from "@/lib/verify/mamba-selective-state-space-module-convergence";

const pageDir = getDocsPageDir("modules", "mamba-selective-state-space");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

describe("mamba-selective-state-space page messages", () => {
  test("includes graph title, legend, caption, and SSM math schema fields", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Mamba Selective State-Space Module");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.assets?.computeFlow?.title).toBe(
      "Sequence mixing over time",
    );
    expect(messages.assets?.computeFlow?.caption).toContain(
      "Dense attention compares the current query",
    );
    expect(messages.assets?.computeFlow?.legend?.["data-flow"]?.label).toBe(
      "Input-dependent update path",
    );
    expect(messages.math?.ssmSchema?.variableDefinitions?.ht?.term).toBe("h_t");
    expect(
      Object.keys(messages.math?.ssmSchema?.variableDefinitions ?? {}),
    ).toEqual([
      ...MAMBA_SELECTIVE_STATE_SPACE_SSM_MATH_VARIABLE_DEFINITION_IDS,
    ]);
  });
});

describe("loadModulePage mamba-selective-state-space", () => {
  test("compiles MDX with teaching graph, legend, and SSM math comparison", async () => {
    const page = await loadModulePage("mamba-selective-state-space");

    expect(page.frontmatter.registryId).toBe(
      "module.mamba-selective-state-space",
    );
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Mamba Selective State-Space Module");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expect(html).toContain("walks the sequence in order");
    expect(html).toContain("input-dependent");
    expect(html).toContain("compares every");
    expect(html).toContain("every other");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain('aria-label="Module metadata"');
    expect(html).toContain("At a glance");
    expect((html.match(/data-testid="tag-pill-list"/g) ?? []).length).toBe(1);
    expect(html).toContain('href="/tags/state-space"');
    expect(html).toContain('href="/tags/context-window"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/docs/modules/linear-attention"');
    expect(html).toContain('href="/docs/models/nemotron-3-super"');
    expect(html).toContain("Ordered recurrent state updates");
    expect(html).toContain(
      `data-graph-id="${MAMBA_SELECTIVE_STATE_SPACE_GRAPH_ID}"`,
    );
    expect(html).toContain(
      `data-graph-title="${MAMBA_SELECTIVE_STATE_SPACE_GRAPH_ID}"`,
    );
    expect(html).toContain(
      `data-graph-legend="${MAMBA_SELECTIVE_STATE_SPACE_GRAPH_ID}"`,
    );
    expect(html).toContain('data-graph-node-id="mamba-time-current-input"');
    expect(html).toContain('data-graph-node-id="mamba-time-selective-gate"');
    expect(html).toContain(
      'data-graph-edge-id="mamba-time-gate-to-state-next"',
    );
    expect(html).toContain(
      'data-table-id="table.mamba-selective-state-space-comparison"',
    );
    expect(html).toContain('data-message-block-math="math.ssmSchema.formula"');
    expect(html).toContain("Input-dependent state transition");
    expect(assertMambaSelectiveStateSpaceModuleConvergence(html)).toBeNull();
  });
});

describe("mamba-selective-state-space converged module page", () => {
  test("static render satisfies shared graph and math convergence helpers", async () => {
    const page = await loadModulePage("mamba-selective-state-space");
    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expect(
      assertMambaSelectiveStateSpaceSingleGraphConvergence(html),
    ).toBeNull();
    expect(
      assertMambaSelectiveStateSpaceGraphThemeConvergence(html),
    ).toBeNull();
    expect(
      assertMambaSelectiveStateSpaceGraphPresentationConvergence(html),
    ).toBeNull();
    expect(
      assertMambaSelectiveStateSpaceMathDefinitionsConvergence(html),
    ).toBeNull();
    expect(assertMambaSelectiveStateSpaceModuleConvergence(html)).toBeNull();
  });
});

describe("mamba-selective-state-space page assets", () => {
  test("resolves graph and table assets with message-backed alt, caption, and legend", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.computeFlow.type).toBe("attention-variant-graph");
    if (assets.computeFlow.type === "attention-variant-graph") {
      expect(assets.computeFlow.captionKey).toBe("assets.computeFlow.caption");
      expect(
        assets.computeFlow.variants.map((variant) => variant.graphId),
      ).toEqual([
        "graph.multi-head-attention-time-pattern",
        MAMBA_SELECTIVE_STATE_SPACE_GRAPH_ID,
      ]);
    }
    expect(assets.comparisonTable.type).toBe("table");
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});
