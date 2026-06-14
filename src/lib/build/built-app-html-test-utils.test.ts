import { describe, expect, test } from "bun:test";
import { normalizeBuiltAppHtmlInternalPaths } from "@/lib/build/built-app-html-test-utils";

describe("normalizeBuiltAppHtmlInternalPaths", () => {
  test("strips GitHub Pages base path from internal hrefs", () => {
    const html =
      '<a href="/ai-model-reference/docs/glossary/vector">vector</a><a href="/docs/glossary/token">token</a>';
    expect(normalizeBuiltAppHtmlInternalPaths(html)).toBe(
      '<a href="/docs/glossary/vector">vector</a><a href="/docs/glossary/token">token</a>',
    );
  });

  test("leaves unprefixed production HTML unchanged", () => {
    const html = '<a href="/docs/glossary/vector">vector</a>';
    expect(normalizeBuiltAppHtmlInternalPaths(html)).toBe(html);
  });
});
