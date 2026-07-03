import { describe, expect, test } from "bun:test";
import { formatBlogPublishedDate } from "./blog-published-date";

describe("formatBlogPublishedDate", () => {
  test("formats valid calendar dates in UTC", () => {
    expect(formatBlogPublishedDate("2026-07-02")).toBe("July 2, 2026");
  });

  test("returns the original value when the date is not YYYY-MM-DD", () => {
    expect(formatBlogPublishedDate("not-a-date")).toBe("not-a-date");
  });
});
