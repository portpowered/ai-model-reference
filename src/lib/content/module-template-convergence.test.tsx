import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const templateRoot = join(process.cwd(), "docs/templates");

describe("module template convergence", () => {
  test("canonical module.mdx follows writing and graphing standards", () => {
    const template = readFileSync(join(templateRoot, "module.mdx"), "utf8");

    expect(template).toContain("<FoldedSummary />");
    expect(template).not.toContain('<T k="problemStatement" />');
    expect(template).not.toContain('<T k="coreIdea" />');
    expect(template).not.toContain("callouts.readerShortcut");
    expect(template).not.toContain('assetId="computeSchema"');
    expect(template).toContain("<ModuleAttentionSchemaComparison />");
    expect(template).toContain(
      '<ModuleGraph registryId="module.example-module" assetId="computeFlow" />',
    );

    const reactFlowGraphSlots = template.match(/<ModuleGraph\b/g) ?? [];
    expect(reactFlowGraphSlots.length).toBe(1);
  });

  test("starter module messages use folded summary and symbol math keys", () => {
    const messages = JSON.parse(
      readFileSync(join(templateRoot, "module.messages.en.json"), "utf8"),
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

    expect("openingSummary" in messages).toBe(true);
    expect(messages.problemStatement).toBeUndefined();
    expect(messages.coreIdea).toBeUndefined();
    expect(messages.callouts?.readerShortcut).toBeUndefined();
    expect(messages.assets?.computeFlow).toBeDefined();
    expect(messages.assets?.computeSchema).toBeUndefined();
    expect(messages.math?.mhaSchema?.variableDefinitions?.q?.term).toBe("Q");
    expect(messages.math?.gqaSchema?.variableDefinitions?.g?.term).toBe("G");
  });

  test("starter module assets omit computeSchema graph slot", () => {
    const assets = JSON.parse(
      readFileSync(join(templateRoot, "module.assets.json"), "utf8"),
    ) as Record<string, unknown>;

    expect(assets.computeFlow).toBeDefined();
    expect(assets.comparisonTable).toBeDefined();
    expect(assets.computeSchema).toBeUndefined();
  });
});
