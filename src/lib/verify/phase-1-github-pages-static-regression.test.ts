import { describe, expect, test } from "bun:test";
import { SEARCH_SURFACE_CUSTOMER_ASK_REASONS } from "./customer-ask-search-surface-convergence";
import { buildGroupedQueryAttentionStubBody } from "./grouped-query-attention-module-convergence";
import {
  buildStaticRegressionGqaModuleRouteRow,
  buildStaticRegressionHomeRouteRow,
  buildStaticRegressionSearchDialogRowsForQuery,
  buildStaticRegressionSearchPageRowsForQuery,
  deriveStaticRegressionEvidence,
  formatStaticRegressionCheckRowLine,
  formatStaticRegressionDomainLine,
  STATIC_REGRESSION_CHECKS,
  STATIC_REGRESSION_DOMAIN_ID,
} from "./phase-1-github-pages-static-regression";
import { PHASE_1_GROUPED_QUERY_ATTENTION_URL } from "./phase-1-search-checks";

const GQA_URL = PHASE_1_GROUPED_QUERY_ATTENTION_URL;

const PASSING_SEARCH_SNAPSHOT = {
  resultUrls: [GQA_URL, "/docs/glossary/token"],
  matchedTagsVisible: false,
  hasResults: true,
  hasEmpty: false,
};

const POST_REPAIR_HOME_HTML = `
  <header>
    <button data-search="" aria-label="Open search">Search</button>
  </header>
  <main>
    <article>
      <h1>Model Atlas</h1>
      <p>Model Atlas intro without inline search handoff.</p>
    </article>
  </main>
`;

describe("buildStaticRegressionSearchPageRowsForQuery", () => {
  test("returns pass rows for canonical page-level hits without matched tags", () => {
    const rows = buildStaticRegressionSearchPageRowsForQuery(
      PASSING_SEARCH_SNAPSHOT,
      "GQA",
    );

    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.status === "pass")).toBe(true);
    expect(rows[0]?.checkId).toBe(
      STATIC_REGRESSION_CHECKS.searchPagePageLevelHits.checkId,
    );
    expect(rows[1]?.checkId).toBe(
      STATIC_REGRESSION_CHECKS.searchPageNoMatchedTags.checkId,
    );
  });

  test("fails when first result URL includes a hash fragment", () => {
    const rows = buildStaticRegressionSearchPageRowsForQuery(
      {
        ...PASSING_SEARCH_SNAPSHOT,
        resultUrls: [`${GQA_URL}#compute-flow`],
      },
      "attention",
    );

    expect(rows[0]?.status).toBe("fail");
    expect(rows[0]?.reason).toBe(
      SEARCH_SURFACE_CUSTOMER_ASK_REASONS.firstResultFragment,
    );
    expect(rows[1]?.status).toBe("pass");
  });
});

describe("buildStaticRegressionSearchDialogRowsForQuery", () => {
  test("returns pass rows for canonical dialog hits without matched tags", () => {
    const rows = buildStaticRegressionSearchDialogRowsForQuery(
      {
        resultUrls: [GQA_URL],
        matchedTagsVisible: false,
        hasResults: true,
        hasEmpty: false,
      },
      "KV cache",
    );

    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.status === "pass")).toBe(true);
  });

  test("fails when matched-tag chips are visible", () => {
    const rows = buildStaticRegressionSearchDialogRowsForQuery(
      {
        resultUrls: [GQA_URL],
        matchedTagsVisible: true,
        hasResults: true,
        hasEmpty: false,
      },
      "GQA",
    );

    expect(rows[0]?.status).toBe("pass");
    expect(rows[1]?.status).toBe("fail");
    expect(rows[1]?.reason).toBe(
      SEARCH_SURFACE_CUSTOMER_ASK_REASONS.matchedTagsVisible,
    );
  });
});

describe("buildStaticRegressionHomeRouteRow", () => {
  test("passes for header-only home search entry", () => {
    const row = buildStaticRegressionHomeRouteRow(POST_REPAIR_HOME_HTML);
    expect(row.status).toBe("pass");
    expect(row.route).toBe("/");
  });

  test("fails when inline home search section remains", () => {
    const row = buildStaticRegressionHomeRouteRow(`
      <header><button data-search="">Search</button></header>
      <main><article><h1>Model Atlas</h1><section id="search"></section></article></main>
    `);
    expect(row.status).toBe("fail");
  });
});

describe("buildStaticRegressionGqaModuleRouteRow", () => {
  test("passes for converged grouped-query-attention presentation markers", () => {
    const row = buildStaticRegressionGqaModuleRouteRow(
      `<html><body>${buildGroupedQueryAttentionStubBody()}</body></html>`,
    );
    expect(row.status).toBe("pass");
    expect(row.route).toBe(GQA_URL);
  });
});

describe("deriveStaticRegressionEvidence", () => {
  test("aggregates fail when any probe row fails", () => {
    const evidence = deriveStaticRegressionEvidence({
      rows: [
        {
          checkId: STATIC_REGRESSION_CHECKS.searchPagePageLevelHits.checkId,
          title: STATIC_REGRESSION_CHECKS.searchPagePageLevelHits.title,
          status: "pass",
          route: "/search",
          query: "GQA",
          checklistRow: "phase-1-github-pages-static-regression",
        },
        {
          checkId: STATIC_REGRESSION_CHECKS.homeHeaderSearchEntry.checkId,
          title: STATIC_REGRESSION_CHECKS.homeHeaderSearchEntry.title,
          status: "fail",
          route: "/",
          reason: "missing global header search entry",
          checklistRow: "phase-1-github-pages-static-regression",
        },
      ],
    });

    expect(evidence.domainId).toBe(STATIC_REGRESSION_DOMAIN_ID);
    expect(evidence.status).toBe("fail");
  });

  test("marks uncertain when probes are skipped upstream", () => {
    const evidence = deriveStaticRegressionEvidence({
      skipped: true,
      skipReason:
        "Static regression probes skipped because build-export failed.",
    });

    expect(evidence.status).toBe("uncertain");
    expect(evidence.reason).toContain("build-export failed");
    expect(evidence.rows).toHaveLength(0);
  });
});

describe("formatStaticRegressionCheckRowLine", () => {
  test("includes route, query, and checklist row in probe output", () => {
    const line = formatStaticRegressionCheckRowLine({
      checkId: STATIC_REGRESSION_CHECKS.searchPagePageLevelHits.checkId,
      title: STATIC_REGRESSION_CHECKS.searchPagePageLevelHits.title,
      status: "fail",
      route: "/search",
      query: "GQA",
      reason: "first visible result URL includes a hash fragment",
      checklistRow: "phase-1-github-pages-static-regression",
    });

    expect(line).toMatch(
      /^\s+\[FAIL\] static-regression\.search\.page\.page-level-hits — .+ \(route=\/search, query=GQA\) — first visible result URL includes a hash fragment — checklistRow=phase-1-github-pages-static-regression$/,
    );
  });
});

describe("formatStaticRegressionDomainLine", () => {
  test("formats domain row with checklist row", () => {
    const line = formatStaticRegressionDomainLine(
      deriveStaticRegressionEvidence({
        rows: [
          {
            checkId: STATIC_REGRESSION_CHECKS.homeHeaderSearchEntry.checkId,
            title: STATIC_REGRESSION_CHECKS.homeHeaderSearchEntry.title,
            status: "pass",
            route: "/",
            checklistRow: "phase-1-github-pages-static-regression",
          },
        ],
      }),
    );

    expect(line).toContain("[PASS] phase-1-static-regression");
    expect(line).toContain(
      "checklistRow=phase-1-github-pages-static-regression",
    );
  });
});
