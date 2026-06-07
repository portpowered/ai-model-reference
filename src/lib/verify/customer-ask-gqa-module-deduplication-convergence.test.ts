import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GROUPED_QUERY_ATTENTION_BUILT_HTML_PATH } from "@/lib/build/verify-grouped-query-attention-built-route";
import { BATCH_012_GQA_MODULE_CHECKS } from "./batch-012-gqa-module-checks";
import {
  assertGqaModuleNoDuplicateBodyHeading,
  assertGqaModuleNoMetadataCard,
  assertGqaModuleSingleTagList,
  buildCustomerAskGqaModuleDeduplicationRows,
  GQA_MODULE_CUSTOMER_ASK_ROUTE,
  GQA_MODULE_DEDUP_CUSTOMER_ASK_REASONS,
} from "./customer-ask-gqa-module-deduplication-convergence";
import {
  buildGroupedQueryAttentionStubBody,
  GROUPED_QUERY_ATTENTION_MODULE_TITLE,
} from "./grouped-query-attention-module-convergence";
import { shouldRunVerifyProductionIntegrationTests } from "./server-lifecycle";

const repoRoot = join(import.meta.dir, "../../..");

const POST_REPAIR_STUB_BODY = buildGroupedQueryAttentionStubBody().replace(
  /<ul data-testid="tag-pill-list"[^>]*><\/ul>/,
  "",
);

const POST_REPAIR_MODULE_HTML = `
  <html>
    <h1>${GROUPED_QUERY_ATTENTION_MODULE_TITLE}</h1>
    <article data-registry-id="module.grouped-query-attention">
      <section aria-label="At a glance">
        <p>At a glance</p>
        <ul data-testid="tag-pill-list" aria-label="Tags">
          <li><a href="/tags/attention">Attention</a></li>
        </ul>
      </section>
      ${POST_REPAIR_STUB_BODY}
    </article>
  </html>
`;

const PRE_REPAIR_DUPLICATE_BODY_H1_HTML = `
  <html>
    <h1>${GROUPED_QUERY_ATTENTION_MODULE_TITLE}</h1>
    <article data-registry-id="module.grouped-query-attention">
      <h1>${GROUPED_QUERY_ATTENTION_MODULE_TITLE}</h1>
      <section aria-label="At a glance"><p>At a glance</p></section>
      <ul data-testid="tag-pill-list" aria-label="Tags"></ul>
    </article>
  </html>
`;

const PRE_REPAIR_DUPLICATE_BODY_H2_HTML = `
  <html>
    <h1>${GROUPED_QUERY_ATTENTION_MODULE_TITLE}</h1>
    <article data-registry-id="module.grouped-query-attention">
      <h2>${GROUPED_QUERY_ATTENTION_MODULE_TITLE}</h2>
      <section aria-label="At a glance"><p>At a glance</p></section>
      <ul data-testid="tag-pill-list" aria-label="Tags"></ul>
    </article>
  </html>
`;

const PRE_REPAIR_METADATA_CARD_HTML = `
  <html>
    <h1>${GROUPED_QUERY_ATTENTION_MODULE_TITLE}</h1>
    <article data-registry-id="module.grouped-query-attention">
      <section aria-label="Module metadata"><p>Registry metadata</p></section>
      <section aria-label="At a glance"><p>At a glance</p></section>
      <ul data-testid="tag-pill-list" aria-label="Tags"></ul>
    </article>
  </html>
`;

const PRE_REPAIR_DUPLICATE_TAG_LIST_HTML = `
  <html>
    <h1>${GROUPED_QUERY_ATTENTION_MODULE_TITLE}</h1>
    <article data-registry-id="module.grouped-query-attention">
      <section aria-label="At a glance"><p>At a glance</p></section>
      <ul data-testid="tag-pill-list" aria-label="Tags"></ul>
      <ul data-testid="tag-pill-list" aria-label="Tags"></ul>
    </article>
  </html>
`;

const PRE_REPAIR_MISSING_TAG_LIST_HTML = `
  <html>
    <h1>${GROUPED_QUERY_ATTENTION_MODULE_TITLE}</h1>
    <article data-registry-id="module.grouped-query-attention">
      <section aria-label="At a glance"><p>At a glance</p></section>
    </article>
  </html>
`;

const PRE_REPAIR_MISSING_AT_A_GLANCE_HTML = `
  <html>
    <h1>${GROUPED_QUERY_ATTENTION_MODULE_TITLE}</h1>
    <article data-registry-id="module.grouped-query-attention">
      <ul data-testid="tag-pill-list" aria-label="Tags"></ul>
    </article>
  </html>
`;

describe("assertGqaModuleNoDuplicateBodyHeading", () => {
  test("passes on post-repair GQA module HTML without duplicate body title", () => {
    expect(
      assertGqaModuleNoDuplicateBodyHeading(POST_REPAIR_MODULE_HTML),
    ).toBeNull();
  });

  test("fails when module body repeats shell title as h1", () => {
    expect(
      assertGqaModuleNoDuplicateBodyHeading(PRE_REPAIR_DUPLICATE_BODY_H1_HTML),
    ).toBe(GQA_MODULE_DEDUP_CUSTOMER_ASK_REASONS.duplicateBodyHeading);
  });

  test("fails when module body repeats page title as h2", () => {
    expect(
      assertGqaModuleNoDuplicateBodyHeading(PRE_REPAIR_DUPLICATE_BODY_H2_HTML),
    ).toBe(GQA_MODULE_DEDUP_CUSTOMER_ASK_REASONS.duplicateBodyH2Title);
  });
});

describe("assertGqaModuleNoMetadataCard", () => {
  test("passes when module metadata card is absent", () => {
    expect(assertGqaModuleNoMetadataCard(POST_REPAIR_MODULE_HTML)).toBeNull();
  });

  test("fails when module metadata card remains", () => {
    expect(assertGqaModuleNoMetadataCard(PRE_REPAIR_METADATA_CARD_HTML)).toBe(
      GQA_MODULE_DEDUP_CUSTOMER_ASK_REASONS.moduleMetadataCard,
    );
  });
});

describe("assertGqaModuleSingleTagList", () => {
  test("passes with At a glance and exactly one tag pill list", () => {
    expect(assertGqaModuleSingleTagList(POST_REPAIR_MODULE_HTML)).toBeNull();
  });

  test("fails on duplicate tag pill list surfaces", () => {
    expect(
      assertGqaModuleSingleTagList(PRE_REPAIR_DUPLICATE_TAG_LIST_HTML),
    ).toBe(GQA_MODULE_DEDUP_CUSTOMER_ASK_REASONS.duplicateTagPillList);
  });

  test("fails when tag pill list marker is missing", () => {
    expect(assertGqaModuleSingleTagList(PRE_REPAIR_MISSING_TAG_LIST_HTML)).toBe(
      GQA_MODULE_DEDUP_CUSTOMER_ASK_REASONS.missingTagPillList,
    );
  });

  test("fails when At a glance section is missing", () => {
    expect(
      assertGqaModuleSingleTagList(PRE_REPAIR_MISSING_AT_A_GLANCE_HTML),
    ).toBe(GQA_MODULE_DEDUP_CUSTOMER_ASK_REASONS.missingAtAGlance);
  });
});

describe("buildCustomerAskGqaModuleDeduplicationRows", () => {
  test("returns pass rows for post-repair GQA module HTML", () => {
    const rows = buildCustomerAskGqaModuleDeduplicationRows(
      POST_REPAIR_MODULE_HTML,
    );
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.checkId)).toEqual([
      BATCH_012_GQA_MODULE_CHECKS.noDuplicateBodyHeading.checkId,
      BATCH_012_GQA_MODULE_CHECKS.noMetadataCard.checkId,
      BATCH_012_GQA_MODULE_CHECKS.singleTagList.checkId,
    ]);
    expect(rows.every((row) => row.status === "pass")).toBe(true);
    expect(
      rows.every((row) => row.route === GQA_MODULE_CUSTOMER_ASK_ROUTE),
    ).toBe(true);
    expect(
      rows.every((row) => row.checklistRow === "phase-1-module-page"),
    ).toBe(true);
  });

  test("fails deduplication checks independently", () => {
    const duplicateHeadingRows = buildCustomerAskGqaModuleDeduplicationRows(
      PRE_REPAIR_DUPLICATE_BODY_H1_HTML,
    );
    expect(
      duplicateHeadingRows.find(
        (row) =>
          row.checkId ===
          BATCH_012_GQA_MODULE_CHECKS.noDuplicateBodyHeading.checkId,
      )?.status,
    ).toBe("fail");

    const metadataRows = buildCustomerAskGqaModuleDeduplicationRows(
      PRE_REPAIR_METADATA_CARD_HTML,
    );
    expect(
      metadataRows.find(
        (row) =>
          row.checkId === BATCH_012_GQA_MODULE_CHECKS.noMetadataCard.checkId,
      )?.reason,
    ).toBe(GQA_MODULE_DEDUP_CUSTOMER_ASK_REASONS.moduleMetadataCard);

    const tagListRows = buildCustomerAskGqaModuleDeduplicationRows(
      PRE_REPAIR_DUPLICATE_TAG_LIST_HTML,
    );
    expect(
      tagListRows.find(
        (row) =>
          row.checkId === BATCH_012_GQA_MODULE_CHECKS.singleTagList.checkId,
      )?.reason,
    ).toBe(GQA_MODULE_DEDUP_CUSTOMER_ASK_REASONS.duplicateTagPillList);
  });
});

describe("buildCustomerAskGqaModuleDeduplicationRows (built HTML)", () => {
  test("/docs/modules/grouped-query-attention built HTML reports pass for batch-012 deduplication checks", () => {
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

    const rows = buildCustomerAskGqaModuleDeduplicationRows(
      readFileSync(builtPath, "utf8"),
    );
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.checkId)).toEqual([
      BATCH_012_GQA_MODULE_CHECKS.noDuplicateBodyHeading.checkId,
      BATCH_012_GQA_MODULE_CHECKS.noMetadataCard.checkId,
      BATCH_012_GQA_MODULE_CHECKS.singleTagList.checkId,
    ]);
    expect(rows.every((row) => row.status === "pass")).toBe(true);
  });
});
