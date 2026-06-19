import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listPublishedGlossaryPages } from "@/lib/content/glossary";

const TOKEN_TITLE = "Token";
const TOKEN_SUMMARY =
  "The smallest unit of text a language model reads and predicts—usually a word piece, not always a whole word. Each token ID maps to a dense vector through vector embedding of model hidden size before attention runs.";
const TOKEN_URL = "/docs/glossary/token";

describe("listPublishedGlossaryPages", () => {
  test("includes published token glossary entry with resolved title, summary, and URL", async () => {
    const pages = await listPublishedGlossaryPages();
    const token = pages.find((page) => page.slug === "token");

    expect(token).toEqual({
      slug: "token",
      title: TOKEN_TITLE,
      summary: TOKEN_SUMMARY,
      url: TOKEN_URL,
    });
  });

  test("returns entries sorted alphabetically by title", async () => {
    const pages = await listPublishedGlossaryPages();
    const titles = pages.map((page) => page.title);
    const sorted = [...titles].sort((a, b) => a.localeCompare(b, "en"));

    expect(titles).toEqual(sorted);
  });

  let tempRoot: string | undefined;

  afterEach(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
      tempRoot = undefined;
    }
  });

  test("returns an empty list when the glossary content root is missing", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "glossary-pages-empty-"));
    const missingRoot = join(tempRoot, "no-glossary-dir");

    await expect(
      listPublishedGlossaryPages({ contentRoot: missingRoot }),
    ).resolves.toEqual([]);
  });

  test("omits draft glossary pages", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "glossary-pages-draft-"));
    const draftDir = join(tempRoot, "draft-term");
    await mkdir(join(draftDir, "messages"), { recursive: true });
    await writeFile(
      join(draftDir, "page.mdx"),
      `---
kind: glossary
registryId: concept.token
messageNamespace: local
assetNamespace: local
status: draft
tags:
  - attention
updatedAt: "2026-06-03"
---

# Draft
`,
    );
    await writeFile(
      join(draftDir, "messages", "en.json"),
      JSON.stringify({
        title: "Draft Term",
        description: "Should not appear in the index.",
      }),
    );

    await expect(
      listPublishedGlossaryPages({ contentRoot: tempRoot }),
    ).resolves.toEqual([]);
  });

  test("returns only shipped localized glossary pages for non-default locales", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "glossary-pages-localized-"));

    const shippedDir = join(tempRoot, "token");
    await mkdir(join(shippedDir, "messages"), { recursive: true });
    await writeFile(
      join(shippedDir, "page.mdx"),
      `---
kind: glossary
registryId: concept.token
messageNamespace: local
assetNamespace: local
status: published
tags:
  - attention
updatedAt: "2026-06-03"
---

# Token
`,
    );
    await writeFile(
      join(shippedDir, "messages", "en.json"),
      JSON.stringify({
        title: "Token",
        description: "English token page.",
      }),
    );
    await writeFile(
      join(shippedDir, "messages", "vi.json"),
      JSON.stringify({
        title: "Từ mã",
        description: "Trang token tiếng Việt.",
      }),
    );

    const untranslatedDir = join(tempRoot, "vector");
    await mkdir(join(untranslatedDir, "messages"), { recursive: true });
    await writeFile(
      join(untranslatedDir, "page.mdx"),
      `---
kind: glossary
registryId: concept.token
messageNamespace: local
assetNamespace: local
status: published
tags:
  - attention
updatedAt: "2026-06-03"
---

# Vector
`,
    );
    await writeFile(
      join(untranslatedDir, "messages", "en.json"),
      JSON.stringify({
        title: "Vector",
        description: "English-only vector page.",
      }),
    );

    await expect(
      listPublishedGlossaryPages({ contentRoot: tempRoot, locale: "vi" }),
    ).resolves.toEqual([
      {
        slug: "token",
        title: "Từ mã",
        summary: "Trang token tiếng Việt.",
        url: "/vi/docs/token",
      },
    ]);
  });
});
