import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";
import { assertGroupedQueryAttentionModuleConvergence } from "@/lib/verify/grouped-query-attention-module-convergence";

const GQA_BUILT_HTML_PATH =
  ".next/server/app/docs/modules/grouped-query-attention.html";

function readBuiltGqaHtml(): string | null {
  const absolutePath = join(process.cwd(), GQA_BUILT_HTML_PATH);
  if (!existsSync(absolutePath)) {
    return null;
  }
  return readFileSync(absolutePath, "utf8");
}

describe("grouped-query-attention built route convergence", () => {
  test("/docs/modules/grouped-query-attention built HTML meets Phase 1 module markers", () => {
    const html = readBuiltGqaHtml();
    if (!html) {
      return;
    }

    const visibleHtml = stripHtmlScripts(html);
    expect(
      assertGroupedQueryAttentionModuleConvergence(visibleHtml),
    ).toBeNull();
  });
});
