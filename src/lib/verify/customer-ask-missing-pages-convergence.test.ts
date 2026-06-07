import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BATCH_012_ATTENTION_SEARCH_QUERY,
  BATCH_012_MISSING_PAGES_CHECKS,
  BATCH_012_MISSING_PAGES_ROUTES,
} from "./batch-012-missing-pages-checks";
import {
  assertAttentionDiscoverableFromApiResults,
  assertAttentionDiscoverableFromSearchSnapshot,
  assertAttentionRoutePage,
  assertHiddenSizeRoutePage,
  assertVectorRoutePage,
  buildCustomerAskAttentionDiscoverableApiRow,
  buildCustomerAskAttentionDiscoverableSearchRow,
  buildCustomerAskAttentionRouteRow,
  buildCustomerAskHiddenSizeRouteRow,
  buildCustomerAskVectorRouteRow,
  MISSING_PAGES_ATTENTION_REGISTRY_ID,
  MISSING_PAGES_CUSTOMER_ASK_REASONS,
  MISSING_PAGES_HIDDEN_SIZE_REGISTRY_ID,
  MISSING_PAGES_VECTOR_REGISTRY_ID,
} from "./customer-ask-missing-pages-convergence";
import type { SearchSurfaceResultSnapshot } from "./customer-ask-search-surface-convergence";
import { PHASE_1_ATTENTION_MODULE_URL } from "./phase-1-search-checks";

export const POST_REPAIR_ATTENTION_MODULE_HTML = `
  <html>
    <h1>Attention</h1>
    <div data-registry-id="${MISSING_PAGES_ATTENTION_REGISTRY_ID}"></div>
    <p>Phase 1 bridge page</p>
  </html>
`;

export const POST_REPAIR_VECTOR_GLOSSARY_HTML = `
  <html>
    <h1>Vector</h1>
    <article data-registry-id="${MISSING_PAGES_VECTOR_REGISTRY_ID}">
      <section id="what-it-is"><h2>What It Is</h2></section>
    </article>
  </html>
`;

export const POST_REPAIR_HIDDEN_SIZE_GLOSSARY_HTML = `
  <html>
    <h1>Hidden Size</h1>
    <article data-registry-id="${MISSING_PAGES_HIDDEN_SIZE_REGISTRY_ID}">
      <section id="what-it-is"><h2>What It Is</h2></section>
    </article>
  </html>
`;

export const PRE_REPAIR_MISSING_ROUTE_HTML = `
  <html><h1>Not Found</h1><p>Page missing</p></html>
`;

export const PRE_REPAIR_ATTENTION_WITHOUT_REGISTRY_HTML = `
  <html><h1>Attention</h1><p>Placeholder without registry marker</p></html>
`;

function passingSearchSnapshot(
  overrides: Partial<SearchSurfaceResultSnapshot> = {},
): SearchSurfaceResultSnapshot {
  return {
    resultUrls: [
      PHASE_1_ATTENTION_MODULE_URL,
      "/docs/modules/grouped-query-attention",
    ],
    matchedTagsVisible: false,
    hasResults: true,
    hasEmpty: false,
    ...overrides,
  };
}

describe("assertAttentionRoutePage", () => {
  test("passes when attention module HTML includes title and registry markers", () => {
    expect(
      assertAttentionRoutePage(POST_REPAIR_ATTENTION_MODULE_HTML),
    ).toBeNull();
  });

  test("fails when attention route HTML omits the registry marker", () => {
    expect(
      assertAttentionRoutePage(PRE_REPAIR_ATTENTION_WITHOUT_REGISTRY_HTML),
    ).toBe(MISSING_PAGES_CUSTOMER_ASK_REASONS.missingAttentionRegistry);
  });

  test("fails when attention route HTML is missing", () => {
    expect(assertAttentionRoutePage(PRE_REPAIR_MISSING_ROUTE_HTML)).toBe(
      MISSING_PAGES_CUSTOMER_ASK_REASONS.missingAttentionTitle,
    );
  });
});

describe("assertVectorRoutePage", () => {
  test("passes when vector glossary HTML includes title and registry markers", () => {
    expect(assertVectorRoutePage(POST_REPAIR_VECTOR_GLOSSARY_HTML)).toBeNull();
  });

  test("fails when vector route HTML omits the registry marker", () => {
    expect(assertVectorRoutePage(PRE_REPAIR_MISSING_ROUTE_HTML)).toBe(
      MISSING_PAGES_CUSTOMER_ASK_REASONS.missingVectorTitle,
    );
  });
});

describe("assertHiddenSizeRoutePage", () => {
  test("passes when hidden-size glossary HTML includes title and registry markers", () => {
    expect(
      assertHiddenSizeRoutePage(POST_REPAIR_HIDDEN_SIZE_GLOSSARY_HTML),
    ).toBeNull();
  });

  test("fails when hidden-size route HTML omits the registry marker", () => {
    expect(assertHiddenSizeRoutePage(PRE_REPAIR_MISSING_ROUTE_HTML)).toBe(
      MISSING_PAGES_CUSTOMER_ASK_REASONS.missingHiddenSizeTitle,
    );
  });
});

describe("assertAttentionDiscoverableFromSearchSnapshot", () => {
  test("passes when search results include a canonical attention module hit", () => {
    expect(
      assertAttentionDiscoverableFromSearchSnapshot(passingSearchSnapshot()),
    ).toBeNull();
  });

  test("fails when search results omit the attention module page", () => {
    expect(
      assertAttentionDiscoverableFromSearchSnapshot(
        passingSearchSnapshot({
          resultUrls: ["/docs/modules/grouped-query-attention"],
        }),
      ),
    ).toContain(MISSING_PAGES_CUSTOMER_ASK_REASONS.missingAttentionSearchHit);
  });

  test("fails when search results use fragment-only URLs", () => {
    expect(
      assertAttentionDiscoverableFromSearchSnapshot(
        passingSearchSnapshot({
          resultUrls: [`${PHASE_1_ATTENTION_MODULE_URL}#overview`],
        }),
      ),
    ).toBe("search hit URL includes a hash fragment");
  });
});

describe("assertAttentionDiscoverableFromApiResults", () => {
  test("passes when API results include a canonical attention module hit", () => {
    expect(
      assertAttentionDiscoverableFromApiResults([
        { url: PHASE_1_ATTENTION_MODULE_URL },
        { url: "/docs/modules/grouped-query-attention" },
      ]),
    ).toBeNull();
  });

  test("fails when API results omit the attention module page", () => {
    expect(
      assertAttentionDiscoverableFromApiResults([
        { url: "/docs/modules/grouped-query-attention" },
      ]),
    ).toContain(MISSING_PAGES_CUSTOMER_ASK_REASONS.missingAttentionSearchHit);
  });

  test("fails when API results include hash fragments", () => {
    expect(
      assertAttentionDiscoverableFromApiResults([
        { url: `${PHASE_1_ATTENTION_MODULE_URL}#section` },
      ]),
    ).toBe("search hit URL includes a hash fragment");
  });
});

describe("buildCustomerAskMissingPagesRows", () => {
  test("returns pass rows for post-repair route and search fixtures", () => {
    const attentionRow = buildCustomerAskAttentionRouteRow(
      POST_REPAIR_ATTENTION_MODULE_HTML,
    );
    const vectorRow = buildCustomerAskVectorRouteRow(
      POST_REPAIR_VECTOR_GLOSSARY_HTML,
    );
    const hiddenSizeRow = buildCustomerAskHiddenSizeRouteRow(
      POST_REPAIR_HIDDEN_SIZE_GLOSSARY_HTML,
    );
    const searchRow = buildCustomerAskAttentionDiscoverableSearchRow(
      passingSearchSnapshot(),
    );
    const apiRow = buildCustomerAskAttentionDiscoverableApiRow([
      { url: PHASE_1_ATTENTION_MODULE_URL },
    ]);

    expect(attentionRow.status).toBe("pass");
    expect(attentionRow.checkId).toBe(
      BATCH_012_MISSING_PAGES_CHECKS.attentionRoute.checkId,
    );
    expect(attentionRow.route).toBe(
      BATCH_012_MISSING_PAGES_ROUTES.attentionModule,
    );
    expect(attentionRow.checklistRow).toBe("phase-1-module-page");

    expect(vectorRow.status).toBe("pass");
    expect(vectorRow.checklistRow).toBe("phase-1-glossary-page");

    expect(hiddenSizeRow.status).toBe("pass");
    expect(hiddenSizeRow.checklistRow).toBe("phase-1-glossary-page");

    expect(searchRow.status).toBe("pass");
    expect(searchRow.checkId).toBe(
      BATCH_012_MISSING_PAGES_CHECKS.attentionDiscoverable.checkId,
    );
    expect(searchRow.route).toBe(BATCH_012_MISSING_PAGES_ROUTES.searchPage);
    expect(searchRow.query).toBe(BATCH_012_ATTENTION_SEARCH_QUERY);

    expect(apiRow.status).toBe("pass");
    expect(apiRow.route).toBe(BATCH_012_MISSING_PAGES_ROUTES.searchApi);
  });

  test("returns fail rows for pre-repair missing-route fixtures", () => {
    expect(
      buildCustomerAskAttentionRouteRow(PRE_REPAIR_MISSING_ROUTE_HTML).status,
    ).toBe("fail");
    expect(
      buildCustomerAskVectorRouteRow(PRE_REPAIR_MISSING_ROUTE_HTML).status,
    ).toBe("fail");
    expect(
      buildCustomerAskHiddenSizeRouteRow(PRE_REPAIR_MISSING_ROUTE_HTML).status,
    ).toBe("fail");
    expect(
      buildCustomerAskAttentionDiscoverableSearchRow(
        passingSearchSnapshot({
          resultUrls: [],
          hasResults: false,
          hasEmpty: true,
        }),
      ).status,
    ).toBe("fail");
    expect(buildCustomerAskAttentionDiscoverableApiRow([]).status).toBe("fail");
  });
});

describe("buildCustomerAskMissingPagesRows (built HTML)", () => {
  test("attention, vector, and hidden-size built HTML pass when present", () => {
    const attentionPath = join(
      process.cwd(),
      ".next/server/app/docs/modules/attention.html",
    );
    const vectorPath = join(
      process.cwd(),
      ".next/server/app/docs/glossary/vector.html",
    );
    const hiddenSizePath = join(
      process.cwd(),
      ".next/server/app/docs/glossary/hidden-size.html",
    );

    if (
      !existsSync(attentionPath) ||
      !existsSync(vectorPath) ||
      !existsSync(hiddenSizePath)
    ) {
      return;
    }

    expect(
      buildCustomerAskAttentionRouteRow(readFileSync(attentionPath, "utf8"))
        .status,
    ).toBe("pass");
    expect(
      buildCustomerAskVectorRouteRow(readFileSync(vectorPath, "utf8")).status,
    ).toBe("pass");
    expect(
      buildCustomerAskHiddenSizeRouteRow(readFileSync(hiddenSizePath, "utf8"))
        .status,
    ).toBe("pass");
  });
});
