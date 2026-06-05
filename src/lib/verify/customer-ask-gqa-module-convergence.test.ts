import { describe, expect, test } from "bun:test";
import {
  assertGqaModuleListDiscConvergence,
  assertGqaModuleMhaGqaComparisonConvergence,
  assertGqaModulePresentationConvergence,
  buildCustomerAskGqaModuleRows,
  GQA_MODULE_CUSTOMER_ASK_CHECKS,
  GQA_MODULE_CUSTOMER_ASK_REASONS,
  GQA_MODULE_CUSTOMER_ASK_ROUTE,
  GQA_MODULE_REGISTRY_ID,
} from "./customer-ask-gqa-module-convergence";
import { buildGroupedQueryAttentionStubBody } from "./grouped-query-attention-module-convergence";

const POST_REPAIR_MODULE_HTML = `
  <html>
    <h1>Grouped-Query Attention</h1>
    <div data-registry-id="${GQA_MODULE_REGISTRY_ID}"></div>
    <h2>Compared To Nearby Modules</h2>
    <h2>Related</h2>
    <div data-react-flow-graph="true" data-web-renderer="react-flow"></div>
    <span data-graph-node-id="hidden-states"></span>
    <span data-graph-node-id="query-groups"></span>
    <span data-graph-node-id="query-heads"></span>
    <span data-graph-node-id="kv-cache"></span>
    <div data-registry-comparison-table="true" data-table-id="table.grouped-query-attention-comparison"></div>
    <a href="/docs/modules/multi-head-attention">Multi-Head Attention</a>
    <div data-attention-schema-comparison="true"></div>
    <div data-message-block-math="math.mhaSchema.formula" class="katex"></div>
    <div data-message-block-math="math.gqaSchema.formula" class="katex-display"></div>
    <section aria-label="Architecture">
      <ul class="list-none">
        <li><a href="/docs/modules/multi-query-attention">MQA</a></li>
      </ul>
    </section>
    <ul data-testid="tag-pill-list" aria-label="Tags">
      <li><a href="/tags/attention">Attention</a></li>
    </ul>
  </html>
`;

const PRE_REPAIR_VARIANTS_HTML = `
  <html>
    <h1>Grouped-Query Attention</h1>
    <div data-registry-id="${GQA_MODULE_REGISTRY_ID}"></div>
    <h2>Variants And Nearby Modules</h2>
    <div data-react-flow-graph="true"></div>
    <div data-message-block-math="math.mhaSchema.formula" class="katex"></div>
    <div data-message-block-math="math.gqaSchema.formula" class="katex-display"></div>
  </html>
`;

const PRE_REPAIR_DANGLING_TABLE_HTML = `
  <html>
    <h1>Grouped-Query Attention</h1>
    <div data-registry-id="${GQA_MODULE_REGISTRY_ID}"></div>
    <p>>table.grouped-query-attention-comparison<</p>
    <div data-react-flow-graph="true"></div>
    <div data-message-block-math="math.mhaSchema.formula" class="katex"></div>
    <div data-message-block-math="math.gqaSchema.formula" class="katex-display"></div>
  </html>
`;

const PRE_REPAIR_MISSING_REACT_FLOW_HTML = `
  <html>
    <h1>Grouped-Query Attention</h1>
    <div data-registry-id="${GQA_MODULE_REGISTRY_ID}"></div>
    <h2>Compared To Nearby Modules</h2>
    <div data-message-block-math="math.mhaSchema.formula" class="katex"></div>
    <div data-message-block-math="math.gqaSchema.formula" class="katex-display"></div>
  </html>
`;

const PRE_REPAIR_LIST_DISC_HTML = `
  <html>
    <h1>Grouped-Query Attention</h1>
    <div data-registry-id="${GQA_MODULE_REGISTRY_ID}"></div>
    <div data-react-flow-graph="true"></div>
    <section aria-label="Architecture">
      <ul class="list-disc">
        <li><a href="/docs/modules/multi-query-attention">MQA</a></li>
      </ul>
    </section>
    <div data-message-block-math="math.mhaSchema.formula" class="katex"></div>
    <div data-message-block-math="math.gqaSchema.formula" class="katex-display"></div>
  </html>
`;

const PRE_REPAIR_IMPLICIT_PROSE_HTML = `
  <html>
    <h1>Grouped-Query Attention</h1>
    <div data-registry-id="${GQA_MODULE_REGISTRY_ID}"></div>
    <div data-react-flow-graph="true"></div>
    <h2>Compared To Nearby Modules</h2>
    <a href="/docs/modules/multi-head-attention">Multi-Head Attention</a>
    <p>GQA shares fewer KV heads than MHA while keeping multiple query heads.</p>
  </html>
`;

const PRE_REPAIR_MISSING_LATEX_HTML = `
  <html>
    <h1>Grouped-Query Attention</h1>
    <div data-registry-id="${GQA_MODULE_REGISTRY_ID}"></div>
    <div data-react-flow-graph="true"></div>
  </html>
`;

describe("assertGqaModulePresentationConvergence", () => {
  test("passes on post-repair GQA module HTML", () => {
    expect(
      assertGqaModulePresentationConvergence(POST_REPAIR_MODULE_HTML),
    ).toBeNull();
  });

  test("passes on grouped-query-attention stub body used by Phase 1 fixtures", () => {
    expect(
      assertGqaModulePresentationConvergence(
        `<html>${buildGroupedQueryAttentionStubBody()}</html>`,
      ),
    ).toBeNull();
  });

  test("fails when Variants And Nearby Modules section remains", () => {
    expect(
      assertGqaModulePresentationConvergence(PRE_REPAIR_VARIANTS_HTML),
    ).toBe(GQA_MODULE_CUSTOMER_ASK_REASONS.variantsSection);
  });

  test("fails on dangling comparison-table reference", () => {
    expect(
      assertGqaModulePresentationConvergence(PRE_REPAIR_DANGLING_TABLE_HTML),
    ).toBe(GQA_MODULE_CUSTOMER_ASK_REASONS.danglingComparisonTable);
  });

  test("fails when React Flow renderer markers are missing", () => {
    expect(
      assertGqaModulePresentationConvergence(
        PRE_REPAIR_MISSING_REACT_FLOW_HTML,
      ),
    ).toBe(GQA_MODULE_CUSTOMER_ASK_REASONS.missingReactFlowRenderer);
  });
});

describe("assertGqaModuleListDiscConvergence", () => {
  test("passes when architecture and tag lists omit list-disc outside prose", () => {
    expect(
      assertGqaModuleListDiscConvergence(POST_REPAIR_MODULE_HTML),
    ).toBeNull();
  });

  test("fails when non-prose architecture lists use list-disc", () => {
    expect(assertGqaModuleListDiscConvergence(PRE_REPAIR_LIST_DISC_HTML)).toBe(
      GQA_MODULE_CUSTOMER_ASK_REASONS.nonProseListDisc,
    );
  });
});

describe("assertGqaModuleMhaGqaComparisonConvergence", () => {
  test("passes when MHA and GQA formula markers render via katex", () => {
    expect(
      assertGqaModuleMhaGqaComparisonConvergence(POST_REPAIR_MODULE_HTML),
    ).toBeNull();
  });

  test("fails when only implicit prose mentions remain", () => {
    expect(
      assertGqaModuleMhaGqaComparisonConvergence(
        PRE_REPAIR_IMPLICIT_PROSE_HTML,
      ),
    ).toBe(GQA_MODULE_CUSTOMER_ASK_REASONS.implicitProseComparison);
  });

  test("fails when latex comparison markers are missing entirely", () => {
    expect(
      assertGqaModuleMhaGqaComparisonConvergence(PRE_REPAIR_MISSING_LATEX_HTML),
    ).toBe(GQA_MODULE_CUSTOMER_ASK_REASONS.missingLatexComparison);
  });
});

describe("buildCustomerAskGqaModuleRows", () => {
  test("returns pass rows for post-repair GQA module HTML", () => {
    const rows = buildCustomerAskGqaModuleRows(POST_REPAIR_MODULE_HTML);
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.checkId)).toEqual([
      GQA_MODULE_CUSTOMER_ASK_CHECKS.presentation.checkId,
      GQA_MODULE_CUSTOMER_ASK_CHECKS.listDisc.checkId,
      GQA_MODULE_CUSTOMER_ASK_CHECKS.mhaGqaComparison.checkId,
    ]);
    expect(rows.every((row) => row.status === "pass")).toBe(true);
    expect(
      rows.every((row) => row.route === GQA_MODULE_CUSTOMER_ASK_ROUTE),
    ).toBe(true);
    expect(
      rows.every((row) => row.checklistRow === "phase-1-module-page"),
    ).toBe(true);
  });

  test("fails presentation, list-disc, and comparison checks independently", () => {
    const variantsRows = buildCustomerAskGqaModuleRows(
      PRE_REPAIR_VARIANTS_HTML,
    );
    expect(
      variantsRows.find(
        (row) =>
          row.checkId === GQA_MODULE_CUSTOMER_ASK_CHECKS.presentation.checkId,
      )?.status,
    ).toBe("fail");

    const listDiscRows = buildCustomerAskGqaModuleRows(
      PRE_REPAIR_LIST_DISC_HTML,
    );
    expect(
      listDiscRows.find(
        (row) =>
          row.checkId === GQA_MODULE_CUSTOMER_ASK_CHECKS.listDisc.checkId,
      )?.reason,
    ).toBe(GQA_MODULE_CUSTOMER_ASK_REASONS.nonProseListDisc);

    const comparisonRows = buildCustomerAskGqaModuleRows(
      PRE_REPAIR_IMPLICIT_PROSE_HTML,
    );
    expect(
      comparisonRows.find(
        (row) =>
          row.checkId ===
          GQA_MODULE_CUSTOMER_ASK_CHECKS.mhaGqaComparison.checkId,
      )?.reason,
    ).toBe(GQA_MODULE_CUSTOMER_ASK_REASONS.implicitProseComparison);
  });
});
