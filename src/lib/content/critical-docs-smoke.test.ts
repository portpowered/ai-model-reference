import { describe, expect, test } from "bun:test";
import {
  CRITICAL_DOCS_SMOKE_RULES,
  loadCriticalDocsSmokePages,
  matchCriticalDocsSmokeRule,
  toCriticalDocsSmokeLocalRef,
} from "@/lib/content/critical-docs-smoke";

describe("critical docs smoke contract", () => {
  test("documents the supported metadata-backed discovery rules", () => {
    expect(CRITICAL_DOCS_SMOKE_RULES).toEqual([
      {
        id: "attention-module",
        pageKind: "module",
        requiredTag: "attention",
      },
      {
        id: "token-to-probability-chain-glossary",
        pageKind: "glossary",
        requiredTag: "token-to-probability-chain",
      },
    ]);
  });

  test("matches supported module and glossary rules while excluding unsupported kinds and tags", () => {
    expect(
      matchCriticalDocsSmokeRule({
        pageKind: "module",
        tags: ["attention"],
      })?.id,
    ).toBe("attention-module");
    expect(
      matchCriticalDocsSmokeRule({
        pageKind: "glossary",
        tags: ["token-to-probability-chain", "foundations"],
      })?.id,
    ).toBe("token-to-probability-chain-glossary");
    expect(
      matchCriticalDocsSmokeRule({
        pageKind: "glossary",
        tags: ["attention"],
      }),
    ).toBeNull();
    expect(
      matchCriticalDocsSmokeRule({
        pageKind: "model",
        tags: ["attention"],
      }),
    ).toBeNull();
  });

  test("autodiscovers representative critical canonical pages from published metadata", async () => {
    const pages = await loadCriticalDocsSmokePages();
    const urls = pages.map((page) => page.url);
    const byUrl = new Map(pages.map((page) => [page.url, page]));

    expect(urls).toContain("/docs/modules/grouped-query-attention");
    expect(urls).toContain("/docs/modules/multi-head-attention");
    expect(urls).toContain("/docs/glossary/vector");
    expect(urls).toContain("/docs/glossary/hidden-size");
    expect(urls).not.toContain("/docs/training/dpo");
    expect(urls).not.toContain("/docs/models/gpt-3");

    expect(
      byUrl.get("/docs/modules/grouped-query-attention")?.criticalRuleId,
    ).toBe("attention-module");
    expect(byUrl.get("/docs/glossary/vector")?.criticalRuleId).toBe(
      "token-to-probability-chain-glossary",
    );
  });

  test("projects discovered critical pages into stable local docs refs", () => {
    expect(
      toCriticalDocsSmokeLocalRef({
        docsSlug: "modules/grouped-query-attention",
      } as Awaited<ReturnType<typeof loadCriticalDocsSmokePages>>[number]),
    ).toEqual({
      section: "modules",
      slug: "grouped-query-attention",
      routeSlug: ["modules", "grouped-query-attention"],
    });
    expect(() =>
      toCriticalDocsSmokeLocalRef({
        docsSlug: "modules/grouped-query-attention/extra",
      } as Awaited<ReturnType<typeof loadCriticalDocsSmokePages>>[number]),
    ).toThrow(
      "Critical docs smoke page must use a two-segment docsSlug, got modules/grouped-query-attention/extra",
    );
  });
});
