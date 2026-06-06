import { describe, expect, test } from "bun:test";
import {
  bulletlessListBaseClassName,
  bulletlessListClassName,
  bulletlessListMarkersClassName,
  docsResourceCardLinkClassName,
  searchInlineResultsListClassName,
} from "@/features/docs/components/list-decoration";

function expectNoUnderlineUtilities(className: string): void {
  expect(className).toContain("no-underline");
  expect(className).toContain("hover:no-underline");
  const withoutNoUnderline = className.replaceAll("no-underline", "");
  expect(withoutNoUnderline).not.toMatch(/\bunderline\b/);
}

describe("list decoration classes", () => {
  test("bulletlessListMarkersClassName omits list markers", () => {
    expect(bulletlessListMarkersClassName).toBe("list-none");
    expect(bulletlessListMarkersClassName).not.toContain("list-disc");
  });

  test("bulletlessListBaseClassName omits list markers", () => {
    expect(bulletlessListBaseClassName).toContain(
      bulletlessListMarkersClassName,
    );
    expect(bulletlessListBaseClassName).not.toContain("list-disc");
  });

  test("bulletlessListClassName applies margin presets", () => {
    expect(bulletlessListClassName("mt-3")).toContain("mt-3");
    expect(bulletlessListClassName("mt-4")).toContain("mt-4");
    expect(bulletlessListClassName("mt-8")).toContain("mt-8");
    expect(bulletlessListClassName("mt-3")).toContain(
      bulletlessListBaseClassName,
    );
  });

  test("docsResourceCardLinkClassName omits underline utilities", () => {
    expectNoUnderlineUtilities(docsResourceCardLinkClassName);
    expect(docsResourceCardLinkClassName).toContain("focus-visible:ring-2");
    expect(docsResourceCardLinkClassName).toContain("hover:border-ring");
  });

  test("searchInlineResultsListClassName omits list markers", () => {
    expect(searchInlineResultsListClassName).toContain(
      bulletlessListMarkersClassName,
    );
    expect(searchInlineResultsListClassName).not.toContain("list-disc");
    expect(searchInlineResultsListClassName).toContain("divide-y");
  });
});
