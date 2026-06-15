import { describe, expect, test } from "bun:test";
import {
  auditRenderedQualityRichContent,
  collectRichContentDomMetrics,
  RICH_CONTENT_AUDIT_ROUTES,
} from "./rendered-quality-baseline-rich-content";
import {
  assertBackpropagationRichContentConvergence,
  assertGroupedQueryAttentionRichContentConvergence,
  RICH_CONTENT_CODE_SCROLL_MARKER,
  RICH_CONTENT_MATH_SCROLL_MARKER,
  RICH_CONTENT_TABLE_SCROLL_MARKER,
} from "./rendered-quality-rich-content-convergence";

const gqaRoute = RICH_CONTENT_AUDIT_ROUTES[0];
const backpropRoute = RICH_CONTENT_AUDIT_ROUTES[1];

describe("rendered quality rich content", () => {
  test("auditRenderedQualityRichContent passes when scroll surfaces stay contained", () => {
    const issues = auditRenderedQualityRichContent({
      route: gqaRoute,
      viewport: "mobile",
      innerWidth: 390,
      table: { contained: true, scrollable: true, needsScroll: true },
      code: null,
      math: { contained: true, scrollable: true, needsScroll: false },
    });

    expect(issues).toEqual([]);
  });

  test("auditRenderedQualityRichContent reports uncontained table and code surfaces", () => {
    const issues = auditRenderedQualityRichContent({
      route: backpropRoute,
      viewport: "mobile",
      innerWidth: 390,
      table: null,
      code: { contained: false, scrollable: false, needsScroll: true },
      math: { contained: true, scrollable: true, needsScroll: false },
    });

    expect(issues.map((issue) => issue.behavior)).toEqual([
      "code viewport overflow",
      "code horizontal scroll",
    ]);
  });

  test("assertGroupedQueryAttentionRichContentConvergence requires table and math markers", () => {
    const html = `<figure data-registry-comparison-table="true">
      <div class="registry-comparison-table__scroll overflow-x-auto" ${RICH_CONTENT_TABLE_SCROLL_MARKER}></div>
    </figure>
    <div ${RICH_CONTENT_MATH_SCROLL_MARKER} class="overflow-x-auto"></div>`;

    expect(assertGroupedQueryAttentionRichContentConvergence(html)).toBeNull();
  });

  test("assertBackpropagationRichContentConvergence requires code and math markers", () => {
    const html = `<figure class="shiki">
      <div role="region" class="overflow-auto" ${RICH_CONTENT_CODE_SCROLL_MARKER}></div>
    </figure>
    <div ${RICH_CONTENT_MATH_SCROLL_MARKER} class="overflow-x-auto"></div>`;

    expect(assertBackpropagationRichContentConvergence(html)).toBeNull();
  });

  test("collectRichContentDomMetrics is defined for Playwright evaluate", () => {
    expect(typeof collectRichContentDomMetrics).toBe("function");
    expect(collectRichContentDomMetrics.name).toBe(
      "collectRichContentDomMetrics",
    );
  });
});
