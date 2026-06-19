import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadPublishedDocsPages,
  loadPublishedDocsPagesSync,
} from "@/lib/content/pages";

describe("loadPublishedDocsPages", () => {
  test("returns an empty list when the docs root is missing", async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), "docs-pages-empty-"));
    const missingRoot = join(tempRoot, "no-docs-dir");

    await expect(loadPublishedDocsPages("en", missingRoot)).resolves.toEqual(
      [],
    );
    expect(loadPublishedDocsPagesSync("en", missingRoot)).toEqual([]);
  });
});
