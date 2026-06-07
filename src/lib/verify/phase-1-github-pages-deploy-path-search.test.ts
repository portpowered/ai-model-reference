import { describe, expect, test } from "bun:test";
import {
  buildDeployPathSearchRowForQuery,
  buildDeployPathSearchRowsFromFailures,
  DEPLOY_PATH_SEARCH_CHECKLIST_ROW,
  DEPLOY_PATH_SEARCH_DOMAIN_ID,
  DEPLOY_PATH_SEARCH_QUERIES,
  deployPathSearchCheckForQuery,
  deriveDeployPathSearchEvidence,
  formatDeployPathSearchCheckRowLine,
  formatDeployPathSearchDomainLine,
} from "./phase-1-github-pages-deploy-path-search";
import { PHASE_1_GROUPED_QUERY_ATTENTION_URL } from "./phase-1-search-checks";

describe("DEPLOY_PATH_SEARCH_QUERIES", () => {
  test("reuses PHASE_1_SEARCH_PAGE_QUERIES without duplicating the list", () => {
    expect([...DEPLOY_PATH_SEARCH_QUERIES]).toEqual([
      "GQA",
      "attention",
      "KV cache",
    ]);
  });
});

describe("deployPathSearchCheckForQuery", () => {
  test("uses stable checkId slugs for each manual-gate query", () => {
    expect(deployPathSearchCheckForQuery("GQA").checkId).toBe(
      "deploy-path-search.search.page.gqa",
    );
    expect(deployPathSearchCheckForQuery("attention").checkId).toBe(
      "deploy-path-search.search.page.attention",
    );
    expect(deployPathSearchCheckForQuery("KV cache").checkId).toBe(
      "deploy-path-search.search.page.kv-cache",
    );
  });
});

describe("buildDeployPathSearchRowForQuery", () => {
  test("returns pass row when probe reason is null", () => {
    const row = buildDeployPathSearchRowForQuery("GQA", null);

    expect(row.status).toBe("pass");
    expect(row.query).toBe("GQA");
    expect(row.route).toBe("/search");
    expect(row.checklistRow).toBe(DEPLOY_PATH_SEARCH_CHECKLIST_ROW);
    expect(row.reason).toBeUndefined();
  });

  test("returns fail row with planner-pasteable reason text", () => {
    const reason = `no visible link to ${PHASE_1_GROUPED_QUERY_ATTENTION_URL} in /search results for query "attention"`;
    const row = buildDeployPathSearchRowForQuery("attention", reason);

    expect(row.status).toBe("fail");
    expect(row.reason).toBe(reason);
    expect(row.checkId).toBe("deploy-path-search.search.page.attention");
  });
});

describe("buildDeployPathSearchRowsFromFailures", () => {
  test("emits one row per query with pass rows for queries without failures", () => {
    const rows = buildDeployPathSearchRowsFromFailures([
      {
        query: "GQA",
        surface: "/search",
        reason: "forced failure for GQA",
      },
    ]);

    expect(rows).toHaveLength(3);
    expect(rows[0]?.status).toBe("fail");
    expect(rows[0]?.query).toBe("GQA");
    expect(rows[1]?.status).toBe("pass");
    expect(rows[1]?.query).toBe("attention");
    expect(rows[2]?.status).toBe("pass");
    expect(rows[2]?.query).toBe("KV cache");
  });
});

describe("deriveDeployPathSearchEvidence", () => {
  test("aggregates pass when all query rows pass", () => {
    const evidence = deriveDeployPathSearchEvidence({
      rows: DEPLOY_PATH_SEARCH_QUERIES.map((query) =>
        buildDeployPathSearchRowForQuery(query, null),
      ),
    });

    expect(evidence.domainId).toBe(DEPLOY_PATH_SEARCH_DOMAIN_ID);
    expect(evidence.checklistRow).toBe(DEPLOY_PATH_SEARCH_CHECKLIST_ROW);
    expect(evidence.status).toBe("pass");
    expect(evidence.rows).toHaveLength(3);
  });

  test("aggregates fail when any query row fails", () => {
    const evidence = deriveDeployPathSearchEvidence({
      rows: [
        buildDeployPathSearchRowForQuery("GQA", null),
        buildDeployPathSearchRowForQuery(
          "attention",
          "empty results state on /search",
        ),
        buildDeployPathSearchRowForQuery("KV cache", null),
      ],
    });

    expect(evidence.status).toBe("fail");
  });

  test("returns uncertain when probes are skipped without rows", () => {
    const evidence = deriveDeployPathSearchEvidence({
      skipped: true,
      skipReason: "VERIFY_BASE_URL was set",
    });

    expect(evidence.status).toBe("uncertain");
    expect(evidence.reason).toBe("VERIFY_BASE_URL was set");
    expect(evidence.rows).toEqual([]);
  });

  test("returns fail when harness acquisition failed upstream", () => {
    const evidence = deriveDeployPathSearchEvidence({
      skipped: true,
      skipStatus: "fail",
      skipReason: "Missing export directory at out",
    });

    expect(evidence.status).toBe("fail");
    expect(evidence.reason).toContain("Missing export directory");
  });
});

describe("formatDeployPathSearchDomainLine", () => {
  test("formats domain line with checklistRow marker", () => {
    const passLine = formatDeployPathSearchDomainLine(
      deriveDeployPathSearchEvidence({
        rows: [buildDeployPathSearchRowForQuery("GQA", null)],
      }),
    );
    const failLine = formatDeployPathSearchDomainLine({
      domainId: DEPLOY_PATH_SEARCH_DOMAIN_ID,
      label: "Phase 1 deploy-path /search regression on static export",
      checklistRow: DEPLOY_PATH_SEARCH_CHECKLIST_ROW,
      status: "fail",
      reason: "harness startup failed",
      rows: [],
    });

    expect(passLine).toContain("deploy-path-search");
    expect(passLine).toContain(
      `checklistRow=${DEPLOY_PATH_SEARCH_CHECKLIST_ROW}`,
    );
    expect(failLine).toContain("[FAIL]");
    expect(failLine).toContain("harness startup failed");
  });
});

describe("formatDeployPathSearchCheckRowLine", () => {
  test("formats query row with route and checklistRow markers", () => {
    const line = formatDeployPathSearchCheckRowLine(
      buildDeployPathSearchRowForQuery("KV cache", "timed out waiting"),
    );

    expect(line).toMatch(
      /^\s+\[FAIL\] deploy-path-search\.search\.page\.kv-cache — .+ \(route=\/search, query=KV cache\) — timed out waiting — checklistRow=phase-1-deploy-path-search$/,
    );
  });
});
