import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GROUPED_QUERY_ATTENTION_PAGE_DIR } from "@/lib/content/content-paths";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import {
  expectModuleComputeFlowGraphOnlyInHowItWorks,
  expectModuleSingleReactFlowGraph,
} from "@/lib/content/module-test-helpers";
import { assertGroupedQueryAttentionSingleGraphConvergence } from "@/lib/verify/grouped-query-attention-module-convergence";

const GQA_COMPUTE_FLOW_GRAPH_ID =
  "graph.grouped-query-attention-compute-flow" as const;

describe("grouped-query-attention module graph deduplication", () => {
  test("published GQA page renders compute-flow graph only in How It Works", () => {
    const raw = readFileSync(
      join(GROUPED_QUERY_ATTENTION_PAGE_DIR, "page.mdx"),
      "utf8",
    );

    const moduleGraphMatches = raw.match(/<ModuleGraph\b/g) ?? [];
    expect(moduleGraphMatches.length).toBe(1);
    expect(raw).toContain('<Section id="how-it-works"');
    expect(raw).toContain('assetId="computeFlow"');
    expect(raw).not.toMatch(
      /<Section id="math-or-compute-schema"[\s\S]*<ModuleGraph/,
    );
    expect(raw).toContain("<ModuleAttentionSchemaComparison");
  });

  test("/docs/modules/grouped-query-attention renders one compute-flow graph under How It Works", async () => {
    const loadedPage = await loadLocalDocsPage({
      section: "modules",
      slug: "grouped-query-attention",
    });

    const html = renderModuleDocsShell(loadedPage);

    expectModuleSingleReactFlowGraph(html);
    expectModuleComputeFlowGraphOnlyInHowItWorks(
      html,
      GQA_COMPUTE_FLOW_GRAPH_ID,
    );
    expect(html).not.toContain(
      'data-graph-id="graph.grouped-query-attention-compute-schema"',
    );
    expect(html).toContain('data-attention-schema-comparison="true"');
    expect(assertGroupedQueryAttentionSingleGraphConvergence(html)).toBeNull();
  });
});
