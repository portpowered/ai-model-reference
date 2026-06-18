import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  loadPublishedDocsPages,
  loadPublishedDocsPagesSync,
} from "@/lib/content/pages";
import { defaultLocale } from "@/lib/i18n/locale-routing";

describe("loadPublishedDocsPages", () => {
  test("returns an empty page set when the docs root does not exist", async () => {
    const tempRoot = mkdtempSync(path.join(tmpdir(), "missing-docs-root-"));
    const missingDocsRoot = path.join(tempRoot, "src", "content", "docs");

    try {
      await expect(
        loadPublishedDocsPages(defaultLocale, missingDocsRoot),
      ).resolves.toEqual([]);
      expect(
        loadPublishedDocsPagesSync(defaultLocale, missingDocsRoot),
      ).toEqual([]);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
