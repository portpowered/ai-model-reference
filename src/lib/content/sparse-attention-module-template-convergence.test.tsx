import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDocsPageDir } from "@/lib/content/content-paths";

const pageDir = getDocsPageDir("modules", "sparse-attention");

describe("sparse-attention canonical page template convergence", () => {
  test("published page.mdx follows hardened module template structure", () => {
    const template = readFileSync(join(pageDir, "page.mdx"), "utf8");

    expect(template).not.toContain("<FoldedSummary />");
    expect(template).not.toContain('<T k="problemStatement" />');
    expect(template).not.toContain('<T k="coreIdea" />');
    expect(template).not.toContain("callouts.readerShortcut");
    expect(template).not.toContain('assetId="computeSchema"');
    expect(template).toContain("<ModuleAttentionSchemaComparison />");
    expect(template).toContain(
      '<ModuleGraph registryId="module.sparse-attention" assetId="computeFlow" />',
    );

    const reactFlowGraphSlots = template.match(/<ModuleGraph\b/g) ?? [];
    expect(reactFlowGraphSlots.length).toBe(1);
  });

  test("published messages use folded summary and symbol math keys", () => {
    const messages = JSON.parse(
      readFileSync(join(pageDir, "messages/en.json"), "utf8"),
    ) as {
      openingSummary?: string;
      problemStatement?: string;
      coreIdea?: string;
      callouts?: { readerShortcut?: unknown };
      assets?: { computeFlow?: unknown; computeSchema?: unknown };
      math?: {
        mhaSchema?: { variableDefinitions?: { q?: { term?: string } } };
        gqaSchema?: { variableDefinitions?: { g?: { term?: string } } };
      };
    };

    expect(messages.openingSummary?.length).toBeGreaterThan(0);
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(messages.callouts?.readerShortcut).toBeUndefined();
    expect(messages.assets?.computeFlow).toBeDefined();
    expect(messages.assets?.computeSchema).toBeUndefined();
    expect(messages.math?.mhaSchema?.variableDefinitions?.q?.term).toBe("Q");
    expect(messages.math?.gqaSchema?.variableDefinitions?.g?.term).toBe("s");
  });

  test("published assets configure sparse attention-variant graph and comparison table", () => {
    const assets = JSON.parse(
      readFileSync(join(pageDir, "assets.json"), "utf8"),
    ) as Record<string, unknown>;

    expect(assets.computeFlow).toBeDefined();
    expect(assets.comparisonTable).toBeDefined();
    expect(assets.computeSchema).toBeUndefined();
  });
});
