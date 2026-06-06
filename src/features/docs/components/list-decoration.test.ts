import { describe, expect, test } from "bun:test";
import {
  bulletlessListBaseClassName,
  bulletlessListClassName,
  docsResourceCardLinkClassName,
} from "@/features/docs/components/list-decoration";

function expectNoUnderlineUtilities(className: string): void {
  expect(className).toContain("no-underline");
  expect(className).toContain("hover:no-underline");
  const withoutNoUnderline = className.replaceAll("no-underline", "");
  expect(withoutNoUnderline).not.toMatch(/\bunderline\b/);
}

describe("list decoration classes", () => {
  test("bulletlessListBaseClassName omits list markers", () => {
    expect(bulletlessListBaseClassName).toContain("list-none");
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
});
