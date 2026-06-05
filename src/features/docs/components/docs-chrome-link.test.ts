import { describe, expect, test } from "bun:test";
import {
  docsChromeLinkClassName,
  docsChromePillLinkClassName,
} from "@/features/docs/components/docs-chrome-link";

function expectNoUnderlineUtilities(className: string): void {
  expect(className).toContain("no-underline");
  expect(className).toContain("hover:no-underline");
  const withoutNoUnderline = className.replaceAll("no-underline", "");
  expect(withoutNoUnderline).not.toMatch(/\bunderline\b/);
}

describe("docs chrome link classes", () => {
  test("docsChromeLinkClassName omits underline utilities", () => {
    expectNoUnderlineUtilities(docsChromeLinkClassName);
    expect(docsChromeLinkClassName).toContain("focus-visible:ring-2");
  });

  test("docsChromePillLinkClassName omits underline utilities", () => {
    expectNoUnderlineUtilities(docsChromePillLinkClassName);
    expect(docsChromePillLinkClassName).toContain("focus-visible:ring-2");
  });
});
