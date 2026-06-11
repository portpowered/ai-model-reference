import { describe, expect, test } from "bun:test";
import {
  auditGqaKeyboardAccessibility,
  auditLinkKeyboardAccessibility,
  auditSearchKeyboardAccessibility,
} from "./rendered-quality-baseline-accessibility";

const searchRoute = {
  path: "/search",
  label: "search",
  kind: "search" as const,
};

const tagsRoute = {
  path: "/tags",
  label: "tags index",
  kind: "tags-index" as const,
};

const gqaRoute = {
  path: "/docs/modules/grouped-query-attention",
  label: "grouped-query-attention",
  kind: "module" as const,
};

describe("auditSearchKeyboardAccessibility", () => {
  test("passes when input, results, and empty suggestion are focusable", () => {
    expect(
      auditSearchKeyboardAccessibility({
        route: searchRoute,
        viewport: "desktop",
        inputFocusable: true,
        resultsFocusable: true,
        emptySuggestionFocusable: true,
      }),
    ).toEqual([]);
  });

  test("fails when first result row is not focusable", () => {
    const issues = auditSearchKeyboardAccessibility({
      route: searchRoute,
      viewport: "mobile",
      inputFocusable: true,
      resultsFocusable: false,
      emptySuggestionFocusable: true,
    });
    expect(issues[0]?.behavior).toBe("search results focus");
  });
});

describe("auditLinkKeyboardAccessibility", () => {
  test("fails when tag link focus ring is not visible", () => {
    const issues = auditLinkKeyboardAccessibility({
      route: tagsRoute,
      viewport: "desktop",
      linkFocusable: true,
      focusRingVisible: false,
    });
    expect(issues[0]?.behavior).toBe("tag link focus ring");
  });
});

describe("auditGqaKeyboardAccessibility", () => {
  test("fails when graph switcher does not activate from keyboard", () => {
    const issues = auditGqaKeyboardAccessibility({
      route: gqaRoute,
      viewport: "desktop",
      switcherActivated: false,
      tocLinkFocusable: true,
      sidebarLinkFocusable: true,
    });
    expect(issues[0]?.behavior).toBe("graph switcher keyboard");
  });
});
