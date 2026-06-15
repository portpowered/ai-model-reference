import { describe, expect, test } from "bun:test";
import {
  assertBuiltAppRouteHtml,
  readBuiltAppServerHtml,
} from "@/lib/build/built-app-html-test-utils";
import { PHASE_1_GROUPED_QUERY_ATTENTION_MODULE_URL } from "@/lib/content/phase-1-published-resources";
import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";
import { shouldRunBuiltHtmlConvergenceTests } from "@/lib/verify/server-lifecycle";

const ATTENTION_TAG_LANDING_ROUTE = "/tags/attention";
const ATTENTION_TAG_LANDING_HTML = "tags/attention.html";
const GQA_HREF = `href="${PHASE_1_GROUPED_QUERY_ATTENTION_MODULE_URL}"`;

describe("Phase 1 attention tag landing built-app HTML", () => {
  if (!shouldRunBuiltHtmlConvergenceTests()) {
    test("skips built HTML probes during coverage subprocess rerun", () => {});
    return;
  }

  test("built /tags/attention satisfies Phase 1 route assertions", () => {
    const html = readBuiltAppServerHtml(ATTENTION_TAG_LANDING_HTML);
    if (!html) {
      return;
    }

    const visibleHtml = stripHtmlScripts(html);
    const failureReason = assertBuiltAppRouteHtml(
      ATTENTION_TAG_LANDING_ROUTE,
      visibleHtml,
    );
    expect(failureReason).toBeNull();
  });

  test("built /tags/attention exposes one grouped-query-attention resource link", () => {
    const html = readBuiltAppServerHtml(ATTENTION_TAG_LANDING_HTML);
    if (!html) {
      return;
    }

    const visibleHtml = stripHtmlScripts(html);
    const gqaLinkCount = visibleHtml.split(GQA_HREF).length - 1;

    expect(gqaLinkCount).toBe(1);
    expect(visibleHtml).toContain("Grouped-Query Attention");
    expect(visibleHtml).toContain('href="/search?tag=attention"');
    expect(visibleHtml).not.toContain("lorem");
  });
});
