import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { exportHtmlReferencesBasePathAssets } from "@/lib/build/verify-export-base-path";

describe("ensureExportSearchArtifacts base-path matching", () => {
  test("exportHtmlReferencesBasePathAssets distinguishes prefixed and default HTML", () => {
    const prefixedHtml =
      '<html><script src="/ai-model-reference/_next/static/chunk.js"></script></html>';
    const defaultHtml =
      '<html><script src="/_next/static/chunk.js"></script></html>';

    expect(
      exportHtmlReferencesBasePathAssets(prefixedHtml, "/ai-model-reference"),
    ).toBe(true);
    expect(
      exportHtmlReferencesBasePathAssets(defaultHtml, "/ai-model-reference"),
    ).toBe(false);
  });

  test("writes search.html fixture for matcher checks", () => {
    const root = mkdtempSync(join(tmpdir(), "ensure-export-artifacts-"));
    const outDir = join(root, "out");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(
      join(outDir, "search.html"),
      '<html><script src="/_next/static/chunk.js"></script></html>',
    );

    expect(
      exportHtmlReferencesBasePathAssets(
        '<html><script src="/_next/static/chunk.js"></script></html>',
        "/ai-model-reference",
      ),
    ).toBe(false);

    rmSync(root, { recursive: true, force: true });
  });
});
