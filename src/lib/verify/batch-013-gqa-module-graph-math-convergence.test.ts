import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GROUPED_QUERY_ATTENTION_BUILT_HTML_PATH } from "@/lib/build/verify-grouped-query-attention-built-route";
import { BATCH_013_GQA_MODULE_CHECKS } from "./batch-013-gqa-module-checks";
import {
  buildBatch013GqaModuleGraphMathRows,
  buildBatch013GqaModuleGraphThemeReadabilityRow,
  buildBatch013GqaModuleMathQkvDefinitionsRow,
  buildBatch013GqaModuleNoDuplicateMathGraphRow,
} from "./batch-013-gqa-module-graph-math-convergence";
import { GQA_MODULE_CUSTOMER_ASK_ROUTE } from "./customer-ask-gqa-module-deduplication-convergence";
import {
  assertGqaModuleGraphThemeMarkers,
  assertGqaModuleMathQkvDefinitions,
  assertGqaModuleNoDuplicateMathGraph,
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

export const POST_REPAIR_BATCH_013_GQA_GRAPH_MATH_HTML = `
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

export const PRE_REPAIR_BATCH_013_MISSING_THEME_HTML =
  POST_REPAIR_BATCH_013_GQA_GRAPH_MATH_HTML.replaceAll(
    "--xy-node-color",
    "",
  ).replaceAll("--xy-node-background-color", "");

export const PRE_REPAIR_BATCH_013_DUPLICATE_GRAPH_HTML = `
  <html>
    <h1>${GROUPED_QUERY_ATTENTION_MODULE_TITLE}</h1>
    <article data-registry-id="module.grouped-query-attention">
      <section id="how-it-works">
        <div data-react-flow-graph="true" data-graph-id="graph.grouped-query-attention-compute-flow" style="--xy-node-color:var(--card-foreground);--xy-node-background-color:var(--card)"></div>
      </section>
      <section id="math-or-compute-schema">
        <div data-react-flow-graph="true" data-graph-id="graph.grouped-query-attention-compute-schema"></div>
        <div data-attention-schema-comparison="true"></div>
      </section>
    </article>
  </html>
`;

export const PRE_REPAIR_BATCH_013_SCHEMA_GRAPH_HTML = `
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

export const PRE_REPAIR_BATCH_013_MISSING_MATH_DEFINITIONS_HTML = `
  <html>
    <h1>${GROUPED_QUERY_ATTENTION_MODULE_TITLE}</h1>
    <article data-registry-id="module.grouped-query-attention">
      <section id="how-it-works">
        <div data-react-flow-graph="true" data-graph-id="graph.grouped-query-attention-compute-flow" style="--xy-node-color:var(--card-foreground);--xy-node-background-color:var(--card)"></div>
      </section>
      <section id="math-or-compute-schema">
        <div data-attention-schema-comparison="true"></div>
      </section>
    </article>
  </html>
`;

describe("batch-013 GQA graph and math assertions", () => {
  test("passes when themed node CSS variables are present", () => {
    expect(
      assertGqaModuleGraphThemeMarkers(
        POST_REPAIR_BATCH_013_GQA_GRAPH_MATH_HTML,
      ),
    ).toBeNull();
  });

  test("fails when themed node color variables are missing", () => {
    expect(
      assertGqaModuleGraphThemeMarkers(PRE_REPAIR_BATCH_013_MISSING_THEME_HTML),
    ).toBe(GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS.missingThemedNodeColors);
  });

  test("passes with a single graph outside math/schema sections", () => {
    expect(
      assertGqaModuleNoDuplicateMathGraph(
        POST_REPAIR_BATCH_013_GQA_GRAPH_MATH_HTML,
      ),
    ).toBeNull();
  });

  test("fails when multiple React Flow graph canvases are present", () => {
    expect(
      assertGqaModuleNoDuplicateMathGraph(
        PRE_REPAIR_BATCH_013_DUPLICATE_GRAPH_HTML,
      ),
    ).toBe(GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS.duplicateReactFlowGraph);
  });

  test("fails when a schema graph remains embedded in the math section", () => {
    expect(
      assertGqaModuleNoDuplicateMathGraph(
        PRE_REPAIR_BATCH_013_SCHEMA_GRAPH_HTML,
      ),
    ).toBe(GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS.schemaGraphStillRendered);
  });

  test("passes when plain-language math variable definitions are present", () => {
    expect(
      assertGqaModuleMathQkvDefinitions(
        POST_REPAIR_BATCH_013_GQA_GRAPH_MATH_HTML,
      ),
    ).toBeNull();
  });

  test("fails when math variable definition markers are missing", () => {
    expect(
      assertGqaModuleMathQkvDefinitions(
        PRE_REPAIR_BATCH_013_MISSING_MATH_DEFINITIONS_HTML,
      ),
    ).toBe(GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS.missingMathDefinitions);
  });
});

describe("buildBatch013GqaModuleGraphMathRows", () => {
  test("returns uncertain graph-theme row and pass rows for post-repair HTML in inventory order", () => {
    const rows = buildBatch013GqaModuleGraphMathRows(
      POST_REPAIR_BATCH_013_GQA_GRAPH_MATH_HTML,
    );

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.checkId)).toEqual([
      BATCH_013_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
      BATCH_013_GQA_MODULE_CHECKS.noDuplicateMathGraph.checkId,
      BATCH_013_GQA_MODULE_CHECKS.mathQkvDefinitions.checkId,
    ]);
    expect(
      rows.every((row) => row.route === GQA_MODULE_CUSTOMER_ASK_ROUTE),
    ).toBe(true);

    const themeRow = rows.find(
      (row) =>
        row.checkId ===
        BATCH_013_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
    );
    expect(themeRow?.status).toBe("uncertain");
    expect(themeRow?.checklistRow).toBe("phase-1-module-page");
    expect(themeRow?.reason).toContain(
      GQA_MODULE_GRAPH_THEME_READABILITY_UNCERTAIN_REASON,
    );
    expect(themeRow?.reason).toContain(
      GQA_MODULE_GRAPH_THEME_MANUAL_VISUAL_CHECK_DOC,
    );

    const duplicateGraphRow = rows.find(
      (row) =>
        row.checkId ===
        BATCH_013_GQA_MODULE_CHECKS.noDuplicateMathGraph.checkId,
    );
    expect(duplicateGraphRow?.status).toBe("pass");
    expect(duplicateGraphRow?.checklistRow).toBe("phase-1-module-page");

    const mathRow = rows.find(
      (row) =>
        row.checkId === BATCH_013_GQA_MODULE_CHECKS.mathQkvDefinitions.checkId,
    );
    expect(mathRow?.status).toBe("pass");
    expect(mathRow?.checklistRow).toBe("phase-1-module-page");
  });

  test("fails graph-theme, duplicate-graph, and math checks independently with route evidence", () => {
    const missingThemeRows = buildBatch013GqaModuleGraphMathRows(
      PRE_REPAIR_BATCH_013_MISSING_THEME_HTML,
    );
    expect(
      missingThemeRows.find(
        (row) =>
          row.checkId ===
          BATCH_013_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
      )?.status,
    ).toBe("fail");

    const duplicateGraphRows = buildBatch013GqaModuleGraphMathRows(
      PRE_REPAIR_BATCH_013_DUPLICATE_GRAPH_HTML,
    );
    expect(
      duplicateGraphRows.find(
        (row) =>
          row.checkId ===
          BATCH_013_GQA_MODULE_CHECKS.noDuplicateMathGraph.checkId,
      )?.reason,
    ).toBe(GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS.duplicateReactFlowGraph);

    const missingMathRows = buildBatch013GqaModuleGraphMathRows(
      PRE_REPAIR_BATCH_013_MISSING_MATH_DEFINITIONS_HTML,
    );
    expect(
      missingMathRows.find(
        (row) =>
          row.checkId ===
          BATCH_013_GQA_MODULE_CHECKS.mathQkvDefinitions.checkId,
      )?.reason,
    ).toBe(GQA_MODULE_GRAPH_MATH_CUSTOMER_ASK_REASONS.missingMathDefinitions);
  });
});

describe("batch-013 GQA graph and math row builders", () => {
  test("individual row builders map to batch-013 inventory check ids", () => {
    expect(
      buildBatch013GqaModuleGraphThemeReadabilityRow(
        POST_REPAIR_BATCH_013_GQA_GRAPH_MATH_HTML,
      ).checkId,
    ).toBe(BATCH_013_GQA_MODULE_CHECKS.graphThemeReadability.checkId);
    expect(
      buildBatch013GqaModuleNoDuplicateMathGraphRow(
        POST_REPAIR_BATCH_013_GQA_GRAPH_MATH_HTML,
      ).checkId,
    ).toBe(BATCH_013_GQA_MODULE_CHECKS.noDuplicateMathGraph.checkId);
    expect(
      buildBatch013GqaModuleMathQkvDefinitionsRow(
        POST_REPAIR_BATCH_013_GQA_GRAPH_MATH_HTML,
      ).checkId,
    ).toBe(BATCH_013_GQA_MODULE_CHECKS.mathQkvDefinitions.checkId);
  });
});

describe("buildBatch013GqaModuleGraphMathRows (built HTML)", () => {
  test("/docs/modules/grouped-query-attention built HTML reports batch-013 graph/math convergence rows", () => {
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

    const rows = buildBatch013GqaModuleGraphMathRows(
      readFileSync(builtPath, "utf8"),
    );
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.checkId)).toEqual([
      BATCH_013_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
      BATCH_013_GQA_MODULE_CHECKS.noDuplicateMathGraph.checkId,
      BATCH_013_GQA_MODULE_CHECKS.mathQkvDefinitions.checkId,
    ]);
    expect(
      rows.find(
        (row) =>
          row.checkId ===
          BATCH_013_GQA_MODULE_CHECKS.graphThemeReadability.checkId,
      )?.status,
    ).toBe("uncertain");
    expect(
      rows.filter((row) => row.status === "pass").map((row) => row.checkId),
    ).toEqual([
      BATCH_013_GQA_MODULE_CHECKS.noDuplicateMathGraph.checkId,
      BATCH_013_GQA_MODULE_CHECKS.mathQkvDefinitions.checkId,
    ]);
  });
});
