import { describe, expect, test } from "bun:test";
import { buildGroupedQueryAttentionStubBody } from "@/lib/verify/grouped-query-attention-module-convergence";
import {
  exportHtmlIncludesGqaAttentionVariantGraphShellMarkers,
  exportHtmlReferencesBasePathAssets,
  exportHtmlReferencesBasePathInternalLinks,
} from "./verify-export-base-path";

describe("verify export base path markers", () => {
  test("detects prefixed asset and internal link hrefs", () => {
    const html = `
      <script src="/ai-model-reference/_next/static/chunks/main.js"></script>
      <a href="/ai-model-reference/docs/glossary">Glossary</a>
    `;

    expect(
      exportHtmlReferencesBasePathAssets(html, "/ai-model-reference"),
    ).toBe(true);
    expect(
      exportHtmlReferencesBasePathInternalLinks(html, "/ai-model-reference"),
    ).toBe(true);
  });

  test("returns false for empty base path", () => {
    const html =
      '<script src="/_next/static/chunks/main.js"></script><a href="/docs/glossary">Glossary</a>';

    expect(exportHtmlReferencesBasePathAssets(html, "")).toBe(false);
    expect(exportHtmlReferencesBasePathInternalLinks(html, "")).toBe(false);
  });

  test("detects GQA attention-variant graph shell markers", () => {
    const html = `<html><body>${buildGroupedQueryAttentionStubBody()}</body></html>`;
    expect(exportHtmlIncludesGqaAttentionVariantGraphShellMarkers(html)).toBe(
      true,
    );
    expect(
      exportHtmlIncludesGqaAttentionVariantGraphShellMarkers(
        "<html><body>Grouped-Query Attention</body></html>",
      ),
    ).toBe(false);
  });
});
