import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MODULE_ATTENTION_GQA_MATH_VARIABLE_DEFINITION_IDS,
  MODULE_ATTENTION_MHA_MATH_VARIABLE_DEFINITION_IDS,
} from "@/features/models/components/module-attention-math-variable-definitions";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import { expectModuleMathSchemaDefinitionsInMathSection } from "@/lib/content/module-test-helpers";
import { pageMessagesSchema } from "@/lib/content/schemas";
import { assertGroupedQueryAttentionMathDefinitionsConvergence } from "@/lib/verify/grouped-query-attention-module-convergence";

const groupedQueryAttentionPageDir = getDocsPageDir(
  "modules",
  "grouped-query-attention",
);

describe("grouped-query-attention module math schema definitions", () => {
  test("published GQA messages include symbol-level math variable definitions per formula", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(
        readFileSync(
          join(groupedQueryAttentionPageDir, "messages/en.json"),
          "utf8",
        ),
      ),
    );

    for (const id of MODULE_ATTENTION_MHA_MATH_VARIABLE_DEFINITION_IDS) {
      const row = messages.math?.mhaSchema?.variableDefinitions?.[id];
      expect(row?.term?.length).toBeGreaterThan(0);
      expect(row?.definition?.length).toBeGreaterThan(0);
    }
    for (const id of MODULE_ATTENTION_GQA_MATH_VARIABLE_DEFINITION_IDS) {
      const row = messages.math?.gqaSchema?.variableDefinitions?.[id];
      expect(row?.term?.length).toBeGreaterThan(0);
      expect(row?.definition?.length).toBeGreaterThan(0);
    }
    expect(messages.math?.mhaSchema?.formula?.length).toBeGreaterThan(0);
    expect(messages.math?.gqaSchema?.formula?.length).toBeGreaterThan(0);
    expect(
      messages.math?.mhaSchema?.variableDefinitions?.queryProjection,
    ).toBeUndefined();
    expect(
      messages.math?.gqaSchema?.variableDefinitions?.grouping,
    ).toBeUndefined();
  });

  test("published GQA page uses ModuleAttentionSchemaComparison in math section", () => {
    const raw = readFileSync(
      join(groupedQueryAttentionPageDir, "page.mdx"),
      "utf8",
    );

    expect(raw).toContain('<Section id="math-or-compute-schema"');
    expect(raw).toContain("<ModuleAttentionSchemaComparison");
    expect(raw).not.toMatch(
      /<Section id="math-or-compute-schema"[\s\S]*<ModuleGraph/,
    );
  });

  test("/docs/modules/grouped-query-attention renders symbol definitions under MHA and GQA formulas", async () => {
    const loadedPage = await loadLocalDocsPage({
      section: "modules",
      slug: "grouped-query-attention",
    });

    const html = renderModuleDocsShell(loadedPage);

    expectModuleMathSchemaDefinitionsInMathSection(
      html,
      MODULE_ATTENTION_MHA_MATH_VARIABLE_DEFINITION_IDS,
      MODULE_ATTENTION_GQA_MATH_VARIABLE_DEFINITION_IDS,
    );
    expect(html).toContain('class="katex"');
    expect(html).toContain("katex-display");
    expect(
      assertGroupedQueryAttentionMathDefinitionsConvergence(html),
    ).toBeNull();
  });
});
