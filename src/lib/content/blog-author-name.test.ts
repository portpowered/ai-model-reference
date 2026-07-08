import { describe, expect, test } from "bun:test";
import { formatBlogAuthorName } from "./blog-author-name";

describe("formatBlogAuthorName", () => {
  test("formats hyphenated author ids into title case words", () => {
    expect(formatBlogAuthorName("site-team")).toBe("Site Team");
  });

  test("returns a single-word author unchanged apart from capitalization", () => {
    expect(formatBlogAuthorName("editor")).toBe("Editor");
  });
});
