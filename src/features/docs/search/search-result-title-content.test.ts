import { describe, expect, test } from "bun:test";
import {
  resolveSearchResultTitleContent,
  stripSearchResultTitleMarks,
} from "@/features/docs/search/search-result-title-content";

describe("search-result-title-content", () => {
  test("stripSearchResultTitleMarks removes mark wrappers", () => {
    expect(
      stripSearchResultTitleMarks("<mark>Grouped</mark>-Query Attention"),
    ).toBe("Grouped-Query Attention");
  });

  test("resolveSearchResultTitleContent preserves existing marks", () => {
    const highlighted = "<mark>Grouped</mark>-Query Attention";
    expect(resolveSearchResultTitleContent(highlighted, "Grouped")).toBe(
      highlighted,
    );
  });

  test("resolveSearchResultTitleContent adds marks from query when missing", () => {
    expect(
      resolveSearchResultTitleContent("Grouped-Query Attention", "Grouped"),
    ).toBe("<mark>Grouped</mark>-Query Attention");
  });

  test("resolveSearchResultTitleContent returns plain title without query", () => {
    expect(
      resolveSearchResultTitleContent("Grouped-Query Attention", "   "),
    ).toBe("Grouped-Query Attention");
  });
});
