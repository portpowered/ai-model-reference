import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import { pageMessagesSchema } from "@/lib/content/schemas";

const NEXT_TOKEN_MATH_VARIABLE_DEFINITION_IDS = [
  "xt",
  "ht",
  "xtplus1",
  "xprefix",
  "theta",
  "ptheta",
] as const;

const MTP_MATH_VARIABLE_DEFINITION_IDS = [
  "xt",
  "ht",
  "n",
  "k",
  "xtplusk",
  "xprefix",
  "theta",
  "ptheta",
] as const;

const MULTI_TOKEN_PREDICTION_PAGE_DIR = getDocsPageDir(
  "modules",
  "multi-token-prediction",
);

describe("multi-token-prediction module math schema definitions", () => {
  test("published messages include symbol-level math variable definitions per formula", () => {
    const messages = pageMessagesSchema.parse(
      JSON.parse(
        readFileSync(
          join(MULTI_TOKEN_PREDICTION_PAGE_DIR, "messages/en.json"),
          "utf8",
        ),
      ),
    );

    for (const id of NEXT_TOKEN_MATH_VARIABLE_DEFINITION_IDS) {
      const row = messages.math?.nextTokenSchema?.variableDefinitions?.[id];
      expect(row?.term?.length).toBeGreaterThan(0);
      expect(row?.definition?.length).toBeGreaterThan(0);
    }
    for (const id of MTP_MATH_VARIABLE_DEFINITION_IDS) {
      const row = messages.math?.mtpSchema?.variableDefinitions?.[id];
      expect(row?.term?.length).toBeGreaterThan(0);
      expect(row?.definition?.length).toBeGreaterThan(0);
    }

    expect(messages.math?.nextTokenSchema?.formula).toContain("h_t");
    expect(messages.math?.mtpSchema?.formula).toContain("h_t");
    expect(messages.math?.mtpSchema?.formula).toContain("\\sum_{k=1}^{N}");
    expect(
      messages.math?.nextTokenSchema?.variableDefinitions?.n,
    ).toBeUndefined();
    expect(messages.math?.nextTokenSchema?.variableDefinitions?.xt?.term).toBe(
      "x_t",
    );
    expect(messages.math?.mtpSchema?.variableDefinitions?.ht?.term).toBe("h_t");
  });

  test("published page uses ModuleAttentionSchemaComparison in math section", () => {
    const raw = readFileSync(
      join(MULTI_TOKEN_PREDICTION_PAGE_DIR, "page.mdx"),
      "utf8",
    );

    expect(raw).toContain('<Section id="math-or-compute-schema"');
    expect(raw).toContain(
      '<ModuleAttentionSchemaComparison schemaIds={["nextToken", "mtp"]} />',
    );
    expect(raw).not.toMatch(
      /<Section id="math-or-compute-schema"[\s\S]*<ModuleGraph/,
    );
  });

  test("/docs/modules/multi-token-prediction renders symbol definitions under both objectives", async () => {
    const loadedPage = await loadLocalDocsPage({
      section: "modules",
      slug: "multi-token-prediction",
    });

    const html = renderModuleDocsShell(loadedPage);
    const mathSectionMatch = html.match(
      /<section[^>]*\bid="math-or-compute-schema"[^>]*>[\s\S]*?<\/section>/i,
    );
    const mathSection = mathSectionMatch?.[0] ?? "";

    expect(mathSection).toContain('data-attention-schema-comparison="true"');
    expect(mathSection).toContain('data-math-schema="nextToken"');
    expect(mathSection).toContain('data-math-schema="mtp"');
    for (const id of NEXT_TOKEN_MATH_VARIABLE_DEFINITION_IDS) {
      expect(mathSection).toContain(`data-math-variable-definition="${id}"`);
    }
    for (const id of MTP_MATH_VARIABLE_DEFINITION_IDS) {
      expect(mathSection).toContain(`data-math-variable-definition="${id}"`);
    }
    expect(html).toContain("multi-step generation");
    expect(html).toContain("ordinary generation can still rely");
    expect(html).toContain("head alone");
    expect(html).toContain('class="katex"');
    expect(html).toContain("katex-display");
  });
});
