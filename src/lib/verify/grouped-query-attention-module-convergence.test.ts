import { describe, expect, test } from "bun:test";
import {
  assertGroupedQueryAttentionModuleConvergence,
  GROUPED_QUERY_ATTENTION_FORBIDDEN_MARKERS,
  GROUPED_QUERY_ATTENTION_REQUIRED_MARKERS,
} from "./grouped-query-attention-module-convergence";

const PASSING_HTML = `
<html>
  <h1>Grouped-Query Attention</h1>
  <div data-registry-id="module.grouped-query-attention"></div>
  <h2>Compared To Nearby Modules</h2>
  <h2>Related</h2>
  <span data-graph-node-id="hidden-states"></span>
  <span data-graph-node-id="query-groups"></span>
  <span data-graph-node-id="query-heads"></span>
  <span data-graph-node-id="kv-cache"></span>
  <div data-graph-node-count="6"></div>
  <div data-graph-node-count="5"></div>
  <div data-react-flow-graph="true"></div>
  <a href="/docs/modules/multi-head-attention">MHA</a>
  <span data-prose-auto-link="true"></span>
  <div data-registry-comparison-table="true" data-table-id="table.grouped-query-attention-comparison"></div>
  <th>KV head count</th>
  <a href="/docs/modules/multi-query-attention">MQA</a>
  <tr data-comparison-dimension="cacheFootprint"></tr>
  <div data-attention-schema-comparison="true"></div>
  <div data-message-block-math="math.mhaSchema.formula" class="katex"></div>
  <div data-message-block-math="math.gqaSchema.formula" class="katex-display"></div>
</html>
`;

describe("assertGroupedQueryAttentionModuleConvergence", () => {
  test("passes when required markers are present and forbidden markers absent", () => {
    expect(
      assertGroupedQueryAttentionModuleConvergence(PASSING_HTML),
    ).toBeNull();
  });

  test("reports the first missing required marker", () => {
    const html = PASSING_HTML.replace("Grouped-Query Attention", "");
    expect(assertGroupedQueryAttentionModuleConvergence(html)).toBe(
      "missing expected content: Grouped-Query Attention",
    );
  });

  test("reports forbidden placeholder stubs and removed section heading", () => {
    for (const forbidden of GROUPED_QUERY_ATTENTION_FORBIDDEN_MARKERS) {
      const html = `${PASSING_HTML}${forbidden}`;
      expect(assertGroupedQueryAttentionModuleConvergence(html)).toBe(
        `unexpected content: ${forbidden}`,
      );
    }
  });

  test("rejects lorem placeholder copy", () => {
    expect(
      assertGroupedQueryAttentionModuleConvergence(
        `${PASSING_HTML}<p>lorem ipsum</p>`,
      ),
    ).toBe("placeholder lorem copy detected");
  });

  test("documents the required marker contract", () => {
    expect(GROUPED_QUERY_ATTENTION_REQUIRED_MARKERS.length).toBeGreaterThan(10);
    expect(GROUPED_QUERY_ATTENTION_FORBIDDEN_MARKERS.length).toBeGreaterThan(3);
  });
});
