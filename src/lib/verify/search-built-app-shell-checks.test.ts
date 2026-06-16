import { describe, expect, test } from "bun:test";
import {
  assertSearchPageBuiltAppShell,
  SEARCH_PAGE_CANONICAL_NOTE_MARKER,
} from "./phase-1-search-built-app-shell-checks";
import {
  buildSearchPageExportShellStubBody,
  SEARCH_PAGE_IDLE_HTML_MARKER,
  SEARCH_PAGE_INPUT_HTML_MARKER,
} from "./phase-1-search-export-shell-checks";

describe("assertSearchPageBuiltAppShell", () => {
  test("passes on single title, input, and canonical note markers", () => {
    expect(
      assertSearchPageBuiltAppShell(
        `<html><body>${buildSearchPageExportShellStubBody()}</body></html>`,
      ),
    ).toBeNull();
  });

  test("fails when multiple search inputs are present", () => {
    const html = `<html><body>${buildSearchPageExportShellStubBody()}<input ${SEARCH_PAGE_INPUT_HTML_MARKER} /></body></html>`;
    expect(assertSearchPageBuiltAppShell(html)).toContain(
      "expected exactly one search-page-input",
    );
  });

  test("fails when multiple Search h1 blocks are present", () => {
    const html = `<html><body>${buildSearchPageExportShellStubBody()}<h1>Search</h1></body></html>`;
    expect(assertSearchPageBuiltAppShell(html)).toContain(
      "expected exactly one Search h1",
    );
  });

  test("fails when the canonical note block is duplicated", () => {
    const html = `<html><body>${buildSearchPageExportShellStubBody()}<p>${SEARCH_PAGE_CANONICAL_NOTE_MARKER}</p></body></html>`;
    expect(assertSearchPageBuiltAppShell(html)).toContain(
      "expected exactly one canonical note block",
    );
  });

  test("fails when the idle region marker is missing", () => {
    const html = `<html><h1>Search</h1><p>Search Model Atlas</p><p>${SEARCH_PAGE_CANONICAL_NOTE_MARKER} /search ?q=</p><input ${SEARCH_PAGE_INPUT_HTML_MARKER} /></html>`;
    expect(assertSearchPageBuiltAppShell(html)).toContain(
      SEARCH_PAGE_IDLE_HTML_MARKER,
    );
  });
});
