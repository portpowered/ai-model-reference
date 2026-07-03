import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  blogPostFrontmatterSchema,
  isBlogPostPubliclyVisible,
  isValidCalendarDate,
  parseBlogPostFrontmatter,
} from "./blog-frontmatter";
import { parseYamlFrontmatterBlock } from "./yaml-frontmatter";

const validFrontmatter = {
  messageNamespace: "local",
  assetNamespace: "local",
  publishedAt: "2026-06-02",
  updatedAt: "2026-06-02",
  authors: ["site-team"],
  tags: ["example-tag"],
  relatedDocIds: ["concept.example-concept"],
  status: "draft",
} as const;

describe("blog post frontmatter contract", () => {
  test("accepts the documented blog-post template fields", () => {
    const result = blogPostFrontmatterSchema.safeParse(validFrontmatter);
    expect(result.success).toBe(true);
  });

  test("parses the blog-post MDX template frontmatter block", () => {
    const templatePath = join(process.cwd(), "docs/templates/blog-post.mdx");
    const source = readFileSync(templatePath, "utf8");
    const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    expect(match).not.toBeNull();

    const raw = parseYamlFrontmatterBlock(match?.[1] ?? "");
    const result = parseBlogPostFrontmatter(raw);

    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data).toEqual({
      messageNamespace: "local",
      assetNamespace: "local",
      publishedAt: "2026-06-02",
      updatedAt: "2026-06-02",
      authors: ["site-team"],
      tags: ["example-tag"],
      relatedDocIds: ["concept.example-concept"],
      status: "draft",
    });
  });

  test("accepts published status and treats only published posts as public", () => {
    const published = blogPostFrontmatterSchema.parse({
      ...validFrontmatter,
      status: "published",
    });
    const draft = blogPostFrontmatterSchema.parse({
      ...validFrontmatter,
      status: "draft",
    });

    expect(isBlogPostPubliclyVisible(published)).toBe(true);
    expect(isBlogPostPubliclyVisible(draft)).toBe(false);
  });

  test("rejects invalid calendar dates and malformed date strings", () => {
    expect(isValidCalendarDate("2026-06-02")).toBe(true);
    expect(isValidCalendarDate("2026-13-01")).toBe(false);
    expect(isValidCalendarDate("06-02-2026")).toBe(false);

    const invalidMonth = blogPostFrontmatterSchema.safeParse({
      ...validFrontmatter,
      publishedAt: "2026-13-01",
    });
    expect(invalidMonth.success).toBe(false);

    const malformed = blogPostFrontmatterSchema.safeParse({
      ...validFrontmatter,
      updatedAt: "2026/06/02",
    });
    expect(malformed.success).toBe(false);
  });

  test("rejects non-array values for required array fields", () => {
    for (const field of ["authors", "tags", "relatedDocIds"] as const) {
      const result = blogPostFrontmatterSchema.safeParse({
        ...validFrontmatter,
        [field]: "not-an-array",
      });
      expect(result.success).toBe(false);
    }
  });
});
