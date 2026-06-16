import { describe, expect, test } from "bun:test";
import {
  CUSTOMER_ASK_CONSOLIDATION_DOMAINS,
  customerAskDomainForCheckId,
} from "./customer-ask-domain";
import { buildPhase1CustomerAskReportSlots } from "./phase-1-customer-ask-check-inventory";

describe("customer ask consolidation domains", () => {
  test("domain list matches the test consolidation plan taxonomy", () => {
    expect(CUSTOMER_ASK_CONSOLIDATION_DOMAINS).toEqual([
      "docsShell",
      "searchSurface",
      "staticExport",
      "modulePage",
      "glossaryPage",
      "navigation",
      "contentRegistry",
      "accessibility",
      "deployPosture",
    ]);
  });

  test("every Phase 1 customer-ask inventory slot maps to a stable domain", () => {
    const unmapped = buildPhase1CustomerAskReportSlots()
      .map((slot) => slot.checkId)
      .filter((checkId) => !customerAskDomainForCheckId(checkId));

    expect(unmapped).toEqual([]);
  });

  test("groups repeated query rows by behavior instead of historical batch", () => {
    expect(customerAskDomainForCheckId("search.page.page-level-hits")).toBe(
      "searchSurface",
    );
    expect(customerAskDomainForCheckId("module.no-duplicate-math-graph")).toBe(
      "modulePage",
    );
    expect(
      customerAskDomainForCheckId("glossary.no-rendered-opening-summary"),
    ).toBe("glossaryPage");
    expect(customerAskDomainForCheckId("pages.attention-route")).toBe(
      "navigation",
    );
  });
});
