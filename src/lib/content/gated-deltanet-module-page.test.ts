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
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import {
  expectModuleComputeFlowGraphOnlyInHowItWorks,
  expectModuleTagPillListOnlyInTagsSection,
} from "@/lib/content/module-test-helpers";
import { pageMessagesSchema } from "@/lib/content/schemas";

const pageDir = getDocsPageDir("modules", "gated-deltanet");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");
const defaultGraphId = "graph.gated-deltanet-gdn-comparison";
const gdnMathVariableDefinitionIds = [
  "qt",
  "kt",
  "vt",
  "g",
  "gi",
  "s",
  "o",
] as const;

describe("gated-deltanet page messages", () => {
  test("includes required localized fields for the module template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Gated DeltaNet");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.openingSummary).toContain("Gated Delta Networks");
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(messages.sections?.whatItIs.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.whyItExists.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks.body).toContain(
      "gate α_t is a separate control path",
    );
    expect(messages.sections?.howItWorks.body).toContain(
      "delta-rule path is different",
    );
    expect(messages.sections?.mathOrComputeSchema.body).toContain(
      "α_t controls memory decay",
    );
    expect(messages.sections?.mathOrComputeSchema.body).toContain(
      "targeted delta-rule write",
    );
    expect(messages.sections?.comparedToNearbyModules.body).toContain(
      "DeltaNet-style updates",
    );
    expect(messages.sections?.comparedToNearbyModules.body).toContain(
      "Mamba2-style gating",
    );
    expect(messages.sections?.comparedToNearbyModules.body).toContain(
      "near-linear long-context cost",
    );
    expect(messages.sections?.limitationsAndTradeoffs.body).toContain(
      "compressed rather than directly addressable token by token",
    );
    expect(messages.tables?.comparison?.values?.gdn?.pastAddressability).toContain(
      "compressed into one recurrent state",
    );
    expect(messages.math?.mhaSchema?.variableDefinitions?.q?.term).toBe("Q");
    expect(messages.math?.gdnSchema?.variableDefinitions?.g?.term).toBe(
      "\\alpha_t",
    );
    expect(messages.math?.gdnSchema?.variableDefinitions?.gi?.term).toBe(
      "\\beta_t",
    );
    expect(messages.math?.gdnSchema?.variableDefinitions?.s?.term).toBe("S_t");
    expect(messages.math?.gdnSchema?.variableDefinitions?.o?.term).toBe("o_t");
    expect(messages.assets?.computeFlow?.title).toBe(
      "Gated DeltaNet compute path",
    );
    expect(messages.assets?.computeFlow?.legend?.["control-flow"]?.label).toBe(
      "Gate decay control",
    );
    expect(
      messages.math?.mhaSchema?.variableDefinitions?.queryProjection,
    ).toBeUndefined();
  });
});

describe("loadModulePage gated-deltanet", () => {
  test("compiles MDX with local namespaces and recurrent-memory teaching content", async () => {
    const page = await loadModulePage("gated-deltanet");

    expect(page.frontmatter.registryId).toBe("module.gated-deltanet");
    expect(page.frontmatter.messageNamespace).toBe("local");
    expect(page.frontmatter.assetNamespace).toBe("local");
    expect(page.messages.title).toBe("Gated DeltaNet");

    const html = renderToStaticMarkup(
      createElement(ModulePageProviders, {
        messages: page.messages,
        assets: page.assets,
        // biome-ignore lint/correctness/noChildrenProp: third createElement arg conflicts with strict props typing
        children: page.content,
      }),
    );

    expectGlossaryBodyOmitsTitleHeading(html, page.messages.title);
    expect(html).toContain("Gated Delta Networks");
    expect(html).toContain("compact matrix-valued memory state");
    expect(html).toContain("full attention matrix");
    expect(html).toContain("accumulation-only");
    expect(html).not.toContain("Reader Shortcut");
    expect(html).not.toContain('aria-label="Module metadata"');
    expect(html).toContain("At a glance");
    expectModuleTagPillListOnlyInTagsSection(html);
    expect(html).toContain('href="/tags/attention"');
    expect(html).toContain('href="/tags/context-window"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/docs/modules/linear-attention"');
    expect(html).toContain('href="/docs/modules/sliding-window-attention"');
    expect(html).toContain('href="/docs/modules/sparse-attention"');
    expect(html).toContain('href="/docs/glossary/context-window"');
    expect(html).toContain('href="/docs/concepts/why-long-context-is-hard"');
    expect(html).toContain('data-testid="citation-list"');
    expect(html).toContain("Yang");
    expect(html).toContain('href="https://arxiv.org/abs/2412.06464"');
    expect(html).toContain('data-registry-comparison-table="true"');
    expect(html).toContain('data-table-id="table.gated-deltanet-comparison"');
    expect(html).toContain('data-message-block-math="math.mhaSchema.formula"');
    expect(html).toContain('data-message-block-math="math.gdnSchema.formula"');
    expect(html).toContain('data-math-schema="gdn"');
    expect(html).not.toContain('data-math-schema="gqa"');
    expect(html).toContain("\\alpha_t");
    expect(html).toContain("gate α_t is a separate control path");
    expect(html).toContain("delta-rule path is different");
    expect(html).toContain("Gated decay plus targeted delta-rule memory edits");
    expect(html).toContain(
      "Indirect; the past is compressed into one recurrent state",
    );
    expect(html).toContain("DeltaNet-style updates");
    expect(html).toContain("Mamba2-style gating");
    expect(html).toContain("near-linear long-context cost");
    expect(html).toContain('href="/docs/modules/multi-head-attention"');
    expect(html).toContain('data-comparison-dimension="pastAddressability"');
    expect(html).toContain(
      'data-graph-legend="graph.gated-deltanet-gdn-comparison"',
    );
    expect(html).toContain("Gate decay control");
    expect(html).toContain("Gated DeltaNet compute path");
    expect(html).toContain('data-attention-variant-comparison="true"');
    expect(html).toContain('data-attention-variant-active="gdn"');
    expect(html).toContain('data-attention-variant-option="gdn"');
    expect(html).toContain("--xy-background-color:#ffffff");
    expect(html).toContain("--xy-node-color:#111827");
    for (const id of gdnMathVariableDefinitionIds) {
      expect(html).toContain(`data-math-variable-definition="${id}"`);
    }
    expectModuleComputeFlowGraphOnlyInHowItWorks(html, defaultGraphId);
    expect(html).toContain('data-graph-node-id="gdn-delta"');
    expect(html).toContain('data-graph-node-id="gdn-gate"');
    expect(html).toContain('data-graph-node-id="gdn-memory-prev"');
    expect(html).toContain('data-graph-node-id="gdn-memory-next"');
    expect(html).toContain('data-graph-node-id="gdn-output"');
    expect(html).toContain('data-graph-node-id="gdn-legend"');
  });

  test("renders the shared docs shell with gated delta teaching markers", async () => {
    const page = await loadModulePage("gated-deltanet");
    const html = renderModuleDocsShell(page);

    expect(html).toContain('id="how-it-works"');
    expect(html).toContain('id="math-or-compute-schema"');
    expect(html).toContain(
      'data-graph-id="graph.gated-deltanet-gdn-comparison"',
    );
    expect(html).toContain(
      'data-graph-legend="graph.gated-deltanet-gdn-comparison"',
    );
    expect(html).toContain("α_t controls memory decay");
    expect(html).toContain('data-math-schema="gdn"');
    expect(html).toContain(
      "compressed rather than directly addressable token by token",
    );
    expect(html).toContain('id="compared-to-nearby-modules"');
  });
});

describe("gated-deltanet page assets", () => {
  test("resolves graph and table assets with message-backed alt and captions", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );
    const assets = parsePageAssetConfig(
      JSON.parse(readFileSync(assetsPath, "utf8")),
    );

    expect(assets.computeFlow.type).toBe("attention-variant-graph");
    if (assets.computeFlow.type === "attention-variant-graph") {
      expect(
        assets.computeFlow.variants.map((variant) => variant.graphId),
      ).toEqual([
        "graph.multi-head-attention-mha-comparison",
        "graph.gated-deltanet-gdn-comparison",
      ]);
    }
    expect(assets.comparisonTable.type).toBe("table");
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});
