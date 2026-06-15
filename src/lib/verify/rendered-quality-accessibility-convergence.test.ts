import { describe, expect, test } from "bun:test";
import {
  assertAttentionTagAccessibilityConvergence,
  assertGroupedQueryAttentionAccessibilityConvergence,
  assertSearchPageAccessibilityConvergence,
  assertTagsIndexAccessibilityConvergence,
} from "./rendered-quality-accessibility-convergence";

const passingSearchHtml = `<html><body>
  <input id="search-page-input" />
  <div aria-live="polite">
    <output data-testid="search-page-idle">idle</output>
  </div>
  <button class="focus-visible:ring-ring">retry</button>
</body></html>`;

const passingTagsHtml = `<html><body>
  <nav aria-label="Primary"></nav>
  <a class="group block rounded-lg focus-visible:ring-ring" href="/tags/attention">Attention</a>
</body></html>`;

const passingAttentionTagHtml = `<html><body>
  <nav aria-label="Primary"></nav>
  <button data-search="" class="focus-visible:ring-ring">Search</button>
  <a class="focus-visible:ring-ring" href="/docs/modules/grouped-query-attention">GQA</a>
</body></html>`;

const passingGqaHtml = `<html><body>
  <aside id="nd-sidebar"><a href="/docs/glossary/token">Token</a></aside>
  <nav id="nd-toc"><a href="#how-it-works">How It Works</a></nav>
  <div role="tablist">
    <button data-attention-variant-option="mha" class="focus-visible:outline-ring">MHA</button>
    <button data-attention-variant-option="gqa" class="focus-visible:outline-ring">GQA</button>
  </div>
</body></html>`;

describe("rendered quality accessibility convergence", () => {
  test("passes search page with input, live region, idle state, and focus ring", () => {
    expect(
      assertSearchPageAccessibilityConvergence(passingSearchHtml),
    ).toBeNull();
  });

  test("fails search page without aria-live region", () => {
    const html = passingSearchHtml.replace('aria-live="polite"', "");
    expect(assertSearchPageAccessibilityConvergence(html)).toContain(
      'aria-live="polite"',
    );
  });

  test("passes tags index with primary nav and focus ring links", () => {
    expect(assertTagsIndexAccessibilityConvergence(passingTagsHtml)).toBeNull();
  });

  test("passes attention tag landing with search handoff and focus ring", () => {
    expect(
      assertAttentionTagAccessibilityConvergence(passingAttentionTagHtml),
    ).toBeNull();
  });

  test("passes grouped-query-attention with TOC, switcher, and outline ring", () => {
    expect(
      assertGroupedQueryAttentionAccessibilityConvergence(passingGqaHtml),
    ).toBeNull();
  });

  test("fails grouped-query-attention without TOC anchors", () => {
    const html = passingGqaHtml.replace('href="#how-it-works"', 'href="/docs"');
    expect(assertGroupedQueryAttentionAccessibilityConvergence(html)).toContain(
      "TOC",
    );
  });
});
