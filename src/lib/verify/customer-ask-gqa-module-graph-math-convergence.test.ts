import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GROUPED_QUERY_ATTENTION_BUILT_HTML_PATH } from "@/lib/build/verify-grouped-query-attention-built-route";
import { BATCH_012_GQA_MODULE_CHECKS } from "./batch-012-gqa-module-checks";
import {
  assertGqaModuleGraphThemeMarkers,
  assertGqaModuleMathQkvDefinitions,
  assertGqaModuleNoDuplicateMathGraph,
  buildCustomerAskGqaModuleGraphMathRows,
  GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS,
  GQA_MODULE_GRAPH_THEME_MANUAL_VISUAL_CHECK_DOC,
  GQA_MODULE_GRAPH_THEME_READABILITY_UNCERTAIN_REASON,
} from "./customer-ask-gqa-module-graph-math-convergence";
import {
  buildGroupedQueryAttentionMathComparisonStub,
  buildGroupedQueryAttentionStubBody,
  GROUPED_QUERY_ATTENTION_MODULE_TITLE,
} from "./grouped-query-attention-module-convergence";
import { shouldRunVerifyProductionIntegrationTests } from "./server-lifecycle";

const repoRoot = join(import.meta.dir, "../../..");

const POST_REPAIR_STUB_BODY = buildGroupedQueryAttentionStubBody().replace(
  /<ul data-testid="tag-pill-list"[^>]*><\/ul>/,
  "",
);

const POST_REPAIR_MODULE_HTML = `
  <html>
    <h1>${GROUPED_QUERY_ATTENTION_MODULE_TITLE}</h1>
    <article data-registry-id="module.grouped-query-attention">
      <section id="how-it-works">
        ${POST_REPAIR_STUB_BODY}
      </section>
      <section id="math-or-compute-schema">
        ${buildGroupedQueryAttentionMathComparisonStub()}
      </section>
    </article>
  </html>
`;

const PRE_REPAIR_MISSING_THEME_HTML = POST_REPAIR_MODULE_HTML.replaceAll(
  "--xy-node-color",
  "",
).replaceAll("--xy-node-background-color", "");

const PRE_REPAIR_DUPLICATE_GRAPH_HTML = `
  <html>
    <h1>${GROUPED_QUERY_ATTENTION_MODULE_TITLE}</h1>
    <article data-registry-id="module.grouped-query-attention">
      <section id="how-it-works">
        <div data-react-flow-graph="true" data-graph-id="graph.grouped-query-attention-compute-flow" style="--xy-background-color:#ffffff;--xy-node-color:#111827;--xy-node-background-color:#ffffff;--xy-node-border-color:#cbd5e1"></div>
      </section>
      <section id="math-or-compute-schema">
        <div data-react-flow-graph="true" data-graph-id="graph.grouped-query-attention-compute-schema"></div>
        <div data-attention-schema-comparison="true"></div>
      </section>
    </article>
  </html>
`;

const PRE_REPAIR_SCHEMA_GRAPH_HTML = `
  <html>
    <h1>${GROUPED_QUERY_ATTENTION_MODULE_TITLE}</h1>
    <article data-registry-id="module.grouped-query-attention">
      <section id="how-it-works">
        <p>Flow overview copy without a dedicated graph canvas.</p>
      </section>
      <section id="math-or-compute-schema">
        <div data-attention-schema-comparison="true">
          <div data-react-flow-graph="true" data-graph-id="graph.grouped-query-attention-compute-schema"></div>
        </div>
      </section>
    </article>
  </html>
`;

const PRE_REPAIR_MISSING_MATH_DEFINITIONS_HTML = `
  <html>
    <h1>${GROUPED_QUERY_ATTENTION_MODULE_TITLE}</h1>
    <article data-registry-id="module.grouped-query-attention">
      <section id="how-it-works">
        <div data-react-flow-graph="true" data-graph-id="graph.grouped-query-attention-compute-flow" style="--xy-background-color:#ffffff;--xy-node-color:#111827;--xy-node-background-color:#ffffff;--xy-node-border-color:#cbd5e1"></div>
      </section>
      <section id="math-or-compute-schema">
        <div data-attention-schema-comparison="true"></div>
      </section>
    </article>
  </html>
`;

describe("assertGqaModuleGraphThemeMarkers", () => {
  test("passes when themed node CSS variables are present", () => {
    expect(
      assertGqaModuleGraphThemeMarkers(POST_REPAIR_MODULE_HTML),
    ).toBeNull();
  });

  test("fails when themed node color variables are missing", () => {
    expect(
      assertGqaModuleGraphThemeMarkers(PRE_REPAIR_MISSING_THEME_HTML),
    ).toBe(GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS.missingThemedNodeColors);
  });
});

describe("assertGqaModuleNoDuplicateMathGraph", () => {
  test("passes with a single graph outside math/schema sections", () => {
    expect(
      assertGqaModuleNoDuplicateMathGraph(POST_REPAIR_MODULE_HTML),
    ).toBeNull();
  });

  test("fails when multiple React Flow graph canvases are present", () => {
    expect(
      assertGqaModuleNoDuplicateMathGraph(PRE_REPAIR_DUPLICATE_GRAPH_HTML),
    ).toBe(GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS.duplicateReactFlowGraph);
  });

  test("fails when a schema graph remains embedded in the math section", () => {
    expect(
      assertGqaModuleNoDuplicateMathGraph(PRE_REPAIR_SCHEMA_GRAPH_HTML),
    ).toBe(GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS.schemaGraphStillRendered);
  });
});

describe("assertGqaModuleMathQkvDefinitions", () => {
  test("passes when plain-language math variable definitions are present", () => {
    expect(
      assertGqaModuleMathQkvDefinitions(POST_REPAIR_MODULE_HTML),
    ).toBeNull();
  });

  test("fails when math variable definition markers are missing", () => {
    expect(
      assertGqaModuleMathQkvDefinitions(
        PRE_REPAIR_MISSING_MATH_DEFINITIONS_HTML,
      ),
    ).toBe(GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS.missingMathDefinitions);
  });
});

describe("buildCustomerAskGqaModuleGraphMathRows", () => {
  test("returns uncertain graph-theme row and pass rows for post-repair HTML", () => {
    const rows = buildCustomerAskGqaModuleGraphMathRows(
      POST_REPAIR_MODULE_HTML,
    );
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.checkId)).toEqual([
      BATCH_012_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
      BATCH_012_GQA_MODULE_CHECKS.noDuplicateMathGraph.checkId,
      BATCH_012_GQA_MODULE_CHECKS.mathQkvDefinitions.checkId,
    ]);

    const themeRow = rows.find(
      (row) =>
        row.checkId ===
        BATCH_012_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
    );
    expect(themeRow?.status).toBe("uncertain");
    expect(themeRow?.reason).toContain(
      GQA_MODULE_GRAPH_THEME_READABILITY_UNCERTAIN_REASON,
    );
    expect(themeRow?.reason).toContain(
      GQA_MODULE_GRAPH_THEME_MANUAL_VISUAL_CHECK_DOC,
    );

    expect(
      rows.filter((row) => row.status === "pass").map((row) => row.checkId),
    ).toEqual([
      BATCH_012_GQA_MODULE_CHECKS.noDuplicateMathGraph.checkId,
      BATCH_012_GQA_MODULE_CHECKS.mathQkvDefinitions.checkId,
    ]);
  });

  test("fails graph-theme and duplicate-graph checks independently", () => {
    const missingThemeRows = buildCustomerAskGqaModuleGraphMathRows(
      PRE_REPAIR_MISSING_THEME_HTML,
    );
    expect(
      missingThemeRows.find(
        (row) =>
          row.checkId ===
          BATCH_012_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
      )?.status,
    ).toBe("fail");

    const duplicateGraphRows = buildCustomerAskGqaModuleGraphMathRows(
      PRE_REPAIR_DUPLICATE_GRAPH_HTML,
    );
    expect(
      duplicateGraphRows.find(
        (row) =>
          row.checkId ===
          BATCH_012_GQA_MODULE_CHECKS.noDuplicateMathGraph.checkId,
      )?.reason,
    ).toBe(GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS.duplicateReactFlowGraph);

    const missingMathRows = buildCustomerAskGqaModuleGraphMathRows(
      PRE_REPAIR_MISSING_MATH_DEFINITIONS_HTML,
    );
    expect(
      missingMathRows.find(
        (row) =>
          row.checkId ===
          BATCH_012_GQA_MODULE_CHECKS.mathQkvDefinitions.checkId,
      )?.reason,
    ).toBe(GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS.missingMathDefinitions);
  });
});

describe("buildCustomerAskGqaModuleGraphMathRows (built HTML)", () => {
  test("/docs/modules/grouped-query-attention built HTML reports graph/math convergence rows", () => {
    if (!shouldRunVerifyProductionIntegrationTests(repoRoot)) {
      return;
    }

    const builtPath = join(
      process.cwd(),
      GROUPED_QUERY_ATTENTION_BUILT_HTML_PATH,
    );
    if (!existsSync(builtPath)) {
      return;
    }

    const rows = buildCustomerAskGqaModuleGraphMathRows(
      readFileSync(builtPath, "utf8"),
    );
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.checkId)).toEqual([
      BATCH_012_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
      BATCH_012_GQA_MODULE_CHECKS.noDuplicateMathGraph.checkId,
      BATCH_012_GQA_MODULE_CHECKS.mathQkvDefinitions.checkId,
    ]);
    expect(
      rows.find(
        (row) =>
          row.checkId ===
          BATCH_012_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
      )?.status,
    ).toBe("uncertain");
    expect(
      rows.filter((row) => row.status === "pass").map((row) => row.checkId),
    ).toEqual([
      BATCH_012_GQA_MODULE_CHECKS.noDuplicateMathGraph.checkId,
      BATCH_012_GQA_MODULE_CHECKS.mathQkvDefinitions.checkId,
    ]);
  });
});
