import { describe, expect, test } from "bun:test";
import {
  assertSearchPageExportShell,
  buildSearchPageExportShellStubBody,
  SEARCH_PAGE_ARIA_HIDDEN_PLACEHOLDER_MARKER,
  SEARCH_PAGE_IDLE_HTML_MARKER,
  SEARCH_PAGE_INPUT_HTML_MARKER,
} from "./phase-1-search-export-shell-checks";

describe("assertSearchPageExportShell", () => {
  test("passes on export shell markers and manual-gate copy", () => {
    expect(
      assertSearchPageExportShell(
        `<html><body>${buildSearchPageExportShellStubBody()}</body></html>`,
      ),
    ).toBeNull();
  });

  test("fails when the search input shell marker is missing", () => {
    const html = `<html><h1>Search</h1><p>Search Model Atlas</p><p>/search ?q=</p><output ${SEARCH_PAGE_IDLE_HTML_MARKER}></output></html>`;
    expect(assertSearchPageExportShell(html)).toContain(
      SEARCH_PAGE_INPUT_HTML_MARKER,
    );
  });

  test("fails when the idle region marker is missing", () => {
    const html = `<html><h1>Search</h1><p>Search Model Atlas</p><p>/search ?q=</p><input ${SEARCH_PAGE_INPUT_HTML_MARKER} /></html>`;
    expect(assertSearchPageExportShell(html)).toContain(
      SEARCH_PAGE_IDLE_HTML_MARKER,
    );
  });

  test("fails when the aria-hidden placeholder fallback is present", () => {
    const html = `<html><body>${buildSearchPageExportShellStubBody()}<div ${SEARCH_PAGE_ARIA_HIDDEN_PLACEHOLDER_MARKER}>placeholder</span></div></body></html>`;
    expect(assertSearchPageExportShell(html)).toContain(
      SEARCH_PAGE_ARIA_HIDDEN_PLACEHOLDER_MARKER,
    );
  });
});
