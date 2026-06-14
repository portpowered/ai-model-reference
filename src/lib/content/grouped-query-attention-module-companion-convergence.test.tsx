import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  GROUPED_QUERY_ATTENTION_BUILT_HTML_PATH,
  verifyGroupedQueryAttentionBuiltRouteFromFile,
} from "@/lib/build/verify-grouped-query-attention-built-route";
import { GROUPED_QUERY_ATTENTION_PAGE_DIR } from "@/lib/content/content-paths";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import { expectModuleCompanionSections } from "@/lib/content/module-test-helpers";
import {
  assertGroupedQueryAttentionCompanionSectionsConvergence,
  assertGroupedQueryAttentionModuleConvergence,
} from "@/lib/verify/grouped-query-attention-module-convergence";
import { shouldRunBuiltHtmlConvergenceTests } from "@/lib/verify/server-lifecycle";

describe("grouped-query-attention module companion sections", () => {
  test("published GQA page keeps comparison table, related docs, and attention bridge wiring", () => {
    const raw = readFileSync(
      join(GROUPED_QUERY_ATTENTION_PAGE_DIR, "page.mdx"),
      "utf8",
    );

    expect(raw).toContain('<Section id="compared-to-nearby-modules"');
    expect(raw).toContain("<ModuleComparisonTable");
    expect(raw).toContain('assetId="comparisonTable"');
    expect(raw).toContain('<Section id="related"');
    expect(raw).toContain("<RelatedDocs");
    expect(raw).toContain("<CitationList");
  });

  test("/docs/modules/grouped-query-attention shell render preserves companion sections and full convergence", async () => {
    const loadedPage = await loadLocalDocsPage({
      section: "modules",
      slug: "grouped-query-attention",
    });

    const html = renderModuleDocsShell(loadedPage);

    expectModuleCompanionSections(html);
    expect(
      assertGroupedQueryAttentionCompanionSectionsConvergence(html),
    ).toBeNull();
    expect(assertGroupedQueryAttentionModuleConvergence(html)).toBeNull();
  });

  test("built HTML for /docs/modules/grouped-query-attention passes shared GQA convergence", () => {
    if (!shouldRunBuiltHtmlConvergenceTests()) {
      return;
    }

    const result = verifyGroupedQueryAttentionBuiltRouteFromFile(
      GROUPED_QUERY_ATTENTION_BUILT_HTML_PATH,
    );
    if (!result.ok && result.reason.includes("Missing built HTML")) {
      return;
    }

    expect(result.ok).toBe(true);
  });
});
