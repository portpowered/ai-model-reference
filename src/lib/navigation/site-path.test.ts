import { describe, expect, test } from "bun:test";
import { withBasePath } from "./site-path";

describe("withBasePath", () => {
  test("returns href unchanged when base path is empty", () => {
    expect(withBasePath("/docs/glossary", "")).toBe("/docs/glossary");
  });

  test("prefixes internal absolute paths", () => {
    expect(withBasePath("/docs/glossary", "/ai-model-reference")).toBe(
      "/ai-model-reference/docs/glossary",
    );
  });

  test("leaves external and hash links unchanged", () => {
    expect(
      withBasePath("https://example.com/docs", "/ai-model-reference"),
    ).toBe("https://example.com/docs");
    expect(withBasePath("#section", "/ai-model-reference")).toBe("#section");
  });

  test("does not double-prefix already-prefixed hrefs", () => {
    expect(
      withBasePath("/ai-model-reference/docs/glossary", "/ai-model-reference"),
    ).toBe("/ai-model-reference/docs/glossary");
  });
});
