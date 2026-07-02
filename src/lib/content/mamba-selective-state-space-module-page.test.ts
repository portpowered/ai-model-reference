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

const pageDir = getDocsPageDir("modules", "mamba-selective-state-space");
const messagesPath = join(pageDir, "messages/en.json");
const assetsPath = join(pageDir, "assets.json");

describe("mamba-selective-state-space page messages", () => {
  test("includes required localized fields for the module template", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(readFileSync(messagesPath, "utf8")),
    );

    expect(messages.title).toBe("Mamba Selective State-Space Module");
    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(messages.sections?.whatItIs.body).toContain("state-space module");
    expect(messages.sections?.whatItIs.body).toContain(
      "selective state-space model (SSM)",
    );
    expect(messages.sections?.howItWorks.body).toContain("in order");
    expect(messages.sections?.howItWorks.body).toContain("input-dependent");
    expect(messages.sections?.limitationsAndTradeoffs.body).toContain(
      "sequential",
    );
    expect(messages.sections?.limitationsAndTradeoffs.body).toContain(
      "hybrid Mamba-attention",
    );
    expect(messages.math?.gqaSchema?.variableDefinitions?.q?.term).toBe("h_t");
  });
});

describe("loadModulePage mamba-selective-state-space", () => {
  test("compiles MDX with local namespaces and state-space teaching content", async () => {
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
    expect(html).toContain("every token to every other token");
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
      'data-graph-id="graph.mamba-selective-state-space-state-flow"',
    );
    expect(html).toContain('data-graph-node-id="mamba-time-current-input"');
    expect(html).toContain(
      'data-table-id="table.mamba-selective-state-space-comparison"',
    );
    expect(html).toContain('data-message-block-math="math.gqaSchema.formula"');
    expect(html).toContain("Input-dependent state transition");
  });
});

describe("mamba-selective-state-space page assets", () => {
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
        "graph.multi-head-attention-time-pattern",
        "graph.mamba-selective-state-space-state-flow",
      ]);
    }
    expect(assets.comparisonTable.type).toBe("table");
    expect(validatePageAssetReferences(assets, messages)).toEqual([]);
  });
});
