import { describe, expect, test } from "bun:test";
import { formatTagLabel, tagPageHref } from "@/lib/content/tags";

describe("tags", () => {
  test("formatTagLabel title-cases kebab-case slugs", () => {
    expect(formatTagLabel("kv-cache")).toBe("Kv Cache");
    expect(formatTagLabel("attention")).toBe("Attention");
  });

  test("tagPageHref points at the tag landing route", () => {
    expect(tagPageHref("attention")).toBe("/tags/attention");
  });
});
