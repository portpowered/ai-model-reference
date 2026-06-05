import { describe, expect, test } from "bun:test";
import {
  assertGroupedListSpacingConvergence,
  assertNonProseGroupedListDisc,
  buildCustomerAskTagListRows,
  buildCustomerAskTagListRowsForRoute,
  TAG_LIST_CUSTOMER_ASK_CHECKS,
  TAG_LIST_CUSTOMER_ASK_REASONS,
  TAG_LIST_CUSTOMER_ASK_ROUTES,
} from "./customer-ask-tag-list-convergence";

const POST_REPAIR_TAGS_INDEX_HTML = `
  <section class="flex flex-col gap-8" aria-label="Tags">
    <section aria-labelledby="tag-category-module-type">
      <h2 id="tag-category-module-type">Module type</h2>
      <ul class="mt-3 flex list-none flex-col gap-3">
        <li><a href="/tags/attention">Attention</a></li>
      </ul>
    </section>
  </section>
`;

const PRE_REPAIR_TAGS_INDEX_SPACING_HTML = `
  <section class="mt-8 flex flex-col gap-8" aria-label="Tags">
    <section aria-labelledby="tag-category-module-type">
      <h2 id="tag-category-module-type">Module type</h2>
      <ul class="mt-3 flex list-none flex-col gap-3">
        <li><a href="/tags/attention">Attention</a></li>
      </ul>
    </section>
  </section>
`;

const PRE_REPAIR_TAGS_INDEX_LIST_DISC_HTML = `
  <section class="flex flex-col gap-8" aria-label="Tags">
    <section aria-labelledby="tag-category-module-type">
      <h2 id="tag-category-module-type">Module type</h2>
      <ul class="mt-3 flex list-disc flex-col gap-3">
        <li><a href="/tags/attention">Attention</a></li>
      </ul>
    </section>
  </section>
`;

const POST_REPAIR_ATTENTION_LANDING_HTML = `
  <section class="flex flex-col gap-8" aria-label="Resources">
    <section aria-labelledby="tag-resources-module">
      <h2 id="tag-resources-module">Module</h2>
      <ul class="mt-3 flex list-none flex-col gap-3">
        <li><a href="/docs/modules/grouped-query-attention">Grouped-Query Attention</a></li>
      </ul>
    </section>
  </section>
`;

const PROSE_LIST_DISC_HTML = `
  <div class="prose">
    <ul class="list-disc">
      <li>Allowed prose bullet</li>
    </ul>
  </div>
  ${POST_REPAIR_TAGS_INDEX_HTML}
`;

describe("assertGroupedListSpacingConvergence", () => {
  test("passes when grouped list root omits mt-8 flex gap-8 spacing", () => {
    expect(
      assertGroupedListSpacingConvergence(POST_REPAIR_TAGS_INDEX_HTML),
    ).toBeNull();
  });

  test("fails when grouped list root still uses mt-8 flex flex-col gap-8", () => {
    expect(
      assertGroupedListSpacingConvergence(PRE_REPAIR_TAGS_INDEX_SPACING_HTML),
    ).toBe(TAG_LIST_CUSTOMER_ASK_REASONS.groupedListSpacing);
  });

  test("allows unrelated mt-8 blocks that are not grouped list spacing", () => {
    const html = `
      <output class="mt-8 block rounded-lg border">Empty state</output>
      ${POST_REPAIR_TAGS_INDEX_HTML}
    `;
    expect(assertGroupedListSpacingConvergence(html)).toBeNull();
  });
});

describe("assertNonProseGroupedListDisc", () => {
  test("passes when grouped lists use list-none", () => {
    expect(
      assertNonProseGroupedListDisc(POST_REPAIR_TAGS_INDEX_HTML),
    ).toBeNull();
  });

  test("fails when grouped lists render list-disc outside prose", () => {
    expect(
      assertNonProseGroupedListDisc(PRE_REPAIR_TAGS_INDEX_LIST_DISC_HTML),
    ).toBe(TAG_LIST_CUSTOMER_ASK_REASONS.nonProseListDisc);
  });

  test("allows list-disc inside prose regions", () => {
    expect(assertNonProseGroupedListDisc(PROSE_LIST_DISC_HTML)).toBeNull();
  });
});

describe("buildCustomerAskTagListRowsForRoute", () => {
  test("returns pass rows for post-repair tags index HTML", () => {
    const rows = buildCustomerAskTagListRowsForRoute(
      POST_REPAIR_TAGS_INDEX_HTML,
      TAG_LIST_CUSTOMER_ASK_ROUTES.tagsIndex,
    );

    expect(rows.map((row) => row.checkId)).toEqual([
      TAG_LIST_CUSTOMER_ASK_CHECKS.groupedListSpacing.checkId,
      TAG_LIST_CUSTOMER_ASK_CHECKS.listDiscNonProse.checkId,
    ]);
    expect(rows.every((row) => row.status === "pass")).toBe(true);
    expect(
      rows.every((row) => row.checklistRow === "phase-1-tag-list-styling"),
    ).toBe(true);
  });

  test("fails spacing and list-disc checks independently on pre-repair HTML", () => {
    const spacingRows = buildCustomerAskTagListRowsForRoute(
      PRE_REPAIR_TAGS_INDEX_SPACING_HTML,
      TAG_LIST_CUSTOMER_ASK_ROUTES.tagsIndex,
    );
    const spacingRow = spacingRows.find(
      (row) =>
        row.checkId === TAG_LIST_CUSTOMER_ASK_CHECKS.groupedListSpacing.checkId,
    );
    expect(spacingRow?.status).toBe("fail");
    expect(spacingRow?.reason).toBe(
      TAG_LIST_CUSTOMER_ASK_REASONS.groupedListSpacing,
    );

    const listDiscRows = buildCustomerAskTagListRowsForRoute(
      PRE_REPAIR_TAGS_INDEX_LIST_DISC_HTML,
      TAG_LIST_CUSTOMER_ASK_ROUTES.tagsIndex,
    );
    const listDiscRow = listDiscRows.find(
      (row) =>
        row.checkId === TAG_LIST_CUSTOMER_ASK_CHECKS.listDiscNonProse.checkId,
    );
    expect(listDiscRow?.status).toBe("fail");
    expect(listDiscRow?.reason).toBe(
      TAG_LIST_CUSTOMER_ASK_REASONS.nonProseListDisc,
    );
  });
});

describe("buildCustomerAskTagListRows", () => {
  test("aggregates rows for /tags and /tags/attention", () => {
    const rows = buildCustomerAskTagListRows({
      [TAG_LIST_CUSTOMER_ASK_ROUTES.tagsIndex]: POST_REPAIR_TAGS_INDEX_HTML,
      [TAG_LIST_CUSTOMER_ASK_ROUTES.attentionLanding]:
        POST_REPAIR_ATTENTION_LANDING_HTML,
    });

    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.status === "pass")).toBe(true);
    expect(
      rows.filter(
        (row) => row.route === TAG_LIST_CUSTOMER_ASK_ROUTES.tagsIndex,
      ),
    ).toHaveLength(2);
    expect(
      rows.filter(
        (row) => row.route === TAG_LIST_CUSTOMER_ASK_ROUTES.attentionLanding,
      ),
    ).toHaveLength(2);
  });
});
