import { describe, expect, test } from "bun:test";
import { searchInlineResultsListClassName } from "@/features/docs/components/list-decoration";
import { BATCH_012_TAG_SEARCH_DECORATION_CHECKS } from "./batch-012-tag-search-decoration-checks";
import {
  assertSearchInlineResultNoListDecoration,
  assertTagResourceLinkNoBlanketUnderline,
  buildCustomerAskSearchInlineDecorationRow,
  buildCustomerAskTagResourceLinkRow,
  POST_REPAIR_TAG_RESOURCE_LINK_CLASS,
  TAG_SEARCH_DECORATION_CUSTOMER_ASK_REASONS,
} from "./customer-ask-tag-search-decoration-convergence";

export const POST_REPAIR_TAGS_INDEX_RESOURCE_LINK_HTML = `
  <section class="flex flex-col gap-8" aria-label="Tags">
    <section aria-labelledby="tag-category-module-type">
      <h2 id="tag-category-module-type">Module type</h2>
      <ul class="mt-3 flex list-none flex-col gap-3">
        <li>
          <a href="/tags/attention" class="${POST_REPAIR_TAG_RESOURCE_LINK_CLASS}">
            <span class="font-medium text-foreground">Attention</span>
            <p class="mt-1 text-sm text-muted-foreground">Attention mechanisms</p>
          </a>
        </li>
      </ul>
    </section>
  </section>
`;

export const PRE_REPAIR_TAGS_INDEX_RESOURCE_LINK_HTML = `
  <section class="flex flex-col gap-8" aria-label="Tags">
    <section aria-labelledby="tag-category-module-type">
      <h2 id="tag-category-module-type">Module type</h2>
      <ul class="mt-3 flex list-none flex-col gap-3">
        <li>
          <a href="/tags/attention" class="underline hover:underline">
            <span class="font-medium text-foreground">Attention</span>
            <p class="mt-1 text-sm text-muted-foreground">Attention mechanisms</p>
          </a>
        </li>
      </ul>
    </section>
  </section>
`;

export const POST_REPAIR_ATTENTION_RESOURCE_LINK_HTML = `
  <section class="flex flex-col gap-8" aria-label="Resources">
    <section aria-labelledby="tag-resources-module">
      <h2 id="tag-resources-module">Module</h2>
      <ul class="mt-3 flex list-none flex-col gap-3">
        <li>
          <a href="/docs/modules/grouped-query-attention" class="${POST_REPAIR_TAG_RESOURCE_LINK_CLASS}">
            <span class="font-medium text-foreground">Grouped-Query Attention</span>
            <p class="mt-1 text-sm text-muted-foreground">Shared KV heads</p>
          </a>
        </li>
      </ul>
    </section>
  </section>
`;

export const POST_REPAIR_SEARCH_INLINE_RESULTS_HTML = `
  <ul class="${searchInlineResultsListClassName}" data-testid="search-page-results">
    <li>
      <button type="button" data-testid="search-result-row">
        <span data-testid="search-result-title-mark">Grouped-Query Attention</span>
      </button>
    </li>
  </ul>
`;

export const PRE_REPAIR_SEARCH_INLINE_RESULTS_HTML = `
  <ul class="list-disc divide-y divide-border rounded-lg border border-border" data-testid="search-page-results">
    <li>
      <button type="button" data-testid="search-result-row">
        <span data-testid="search-result-title-mark">Grouped-Query Attention</span>
      </button>
    </li>
  </ul>
`;

describe("assertTagResourceLinkNoBlanketUnderline", () => {
  test("passes when tag resource card links omit persistent underline utilities", () => {
    expect(
      assertTagResourceLinkNoBlanketUnderline(
        POST_REPAIR_TAGS_INDEX_RESOURCE_LINK_HTML,
      ),
    ).toBeNull();
    expect(
      assertTagResourceLinkNoBlanketUnderline(
        POST_REPAIR_ATTENTION_RESOURCE_LINK_HTML,
      ),
    ).toBeNull();
  });

  test("fails when tag resource links keep blanket underline on nested label and meta", () => {
    expect(
      assertTagResourceLinkNoBlanketUnderline(
        PRE_REPAIR_TAGS_INDEX_RESOURCE_LINK_HTML,
      ),
    ).toBe(
      TAG_SEARCH_DECORATION_CUSTOMER_ASK_REASONS.blanketResourceLinkUnderline,
    );
  });
});

describe("assertSearchInlineResultNoListDecoration", () => {
  test("passes when search inline results list omits list-marker decoration", () => {
    expect(
      assertSearchInlineResultNoListDecoration(
        POST_REPAIR_SEARCH_INLINE_RESULTS_HTML,
      ),
    ).toBeNull();
  });

  test("fails when search inline results list renders list-disc outside prose", () => {
    expect(
      assertSearchInlineResultNoListDecoration(
        PRE_REPAIR_SEARCH_INLINE_RESULTS_HTML,
      ),
    ).toBe(
      TAG_SEARCH_DECORATION_CUSTOMER_ASK_REASONS.searchInlineListDecoration,
    );
  });
});

describe("buildCustomerAskTagResourceLinkRow", () => {
  test("returns pass row for post-repair tags index HTML", () => {
    expect(
      buildCustomerAskTagResourceLinkRow(
        POST_REPAIR_TAGS_INDEX_RESOURCE_LINK_HTML,
        "/tags",
      ),
    ).toEqual({
      checkId:
        BATCH_012_TAG_SEARCH_DECORATION_CHECKS.resourceLinkNoBlanketUnderline
          .checkId,
      title:
        BATCH_012_TAG_SEARCH_DECORATION_CHECKS.resourceLinkNoBlanketUnderline
          .title,
      status: "pass",
      route: "/tags",
      checklistRow: "phase-1-tags-page",
    });
  });

  test("returns fail row for pre-repair underline resource links", () => {
    const row = buildCustomerAskTagResourceLinkRow(
      PRE_REPAIR_TAGS_INDEX_RESOURCE_LINK_HTML,
      "/tags",
    );
    expect(row.status).toBe("fail");
    expect(row.reason).toBe(
      TAG_SEARCH_DECORATION_CUSTOMER_ASK_REASONS.blanketResourceLinkUnderline,
    );
    expect(row.checklistRow).toBe("phase-1-tags-page");
  });
});

describe("buildCustomerAskSearchInlineDecorationRow", () => {
  test("returns pass row for post-repair search results list HTML", () => {
    expect(
      buildCustomerAskSearchInlineDecorationRow(
        POST_REPAIR_SEARCH_INLINE_RESULTS_HTML,
        "GQA",
      ),
    ).toEqual({
      checkId:
        BATCH_012_TAG_SEARCH_DECORATION_CHECKS.inlineResultNoListDecoration
          .checkId,
      title:
        BATCH_012_TAG_SEARCH_DECORATION_CHECKS.inlineResultNoListDecoration
          .title,
      status: "pass",
      route: "/search",
      query: "GQA",
      checklistRow: "phase-1-search-surface",
    });
  });

  test("returns fail row for pre-repair list-disc search results", () => {
    const row = buildCustomerAskSearchInlineDecorationRow(
      PRE_REPAIR_SEARCH_INLINE_RESULTS_HTML,
      "attention",
    );
    expect(row.status).toBe("fail");
    expect(row.reason).toBe(
      TAG_SEARCH_DECORATION_CUSTOMER_ASK_REASONS.searchInlineListDecoration,
    );
    expect(row.checklistRow).toBe("phase-1-search-surface");
  });
});
