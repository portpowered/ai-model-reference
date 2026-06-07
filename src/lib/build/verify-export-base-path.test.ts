import { describe, expect, test } from "bun:test";
import {
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
});
