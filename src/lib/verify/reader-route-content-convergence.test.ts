import { describe, expect, test } from "bun:test";
import { PLACEHOLDER_SIDEBAR_DESCRIPTION } from "@/lib/navigation/docs-sidebar-contract";
import {
  assertHomeRouteContentConvergence,
  assertSearchRouteContentConvergence,
  READER_ROUTE_CONTENT_CONVERGENCE_REASONS,
} from "./reader-route-content-convergence";

const PASSING_HOME_HTML = `
  <header><nav aria-label="Primary">Model Atlas</nav></header>
  <main><article><h1>Model Atlas</h1></article></main>
`;

const PASSING_SEARCH_HTML = `
  <header><nav aria-label="Primary">Model Atlas</nav></header>
  <main><h1>Search</h1><p>Search Model Atlas</p></main>
`;

describe("assertHomeRouteContentConvergence", () => {
  test("passes on Phase 1 home content markers", () => {
    expect(assertHomeRouteContentConvergence(PASSING_HOME_HTML)).toBeNull();
  });

  test("fails when Model Atlas marker is missing", () => {
    expect(
      assertHomeRouteContentConvergence("<html><h1>Wrong</h1></html>"),
    ).toBe(READER_ROUTE_CONTENT_CONVERGENCE_REASONS.missingModelAtlas);
  });

  test("fails on placeholder scaffold and lorem copy", () => {
    expect(
      assertHomeRouteContentConvergence(
        `<html>Model Atlas<p>${PLACEHOLDER_SIDEBAR_DESCRIPTION}</p></html>`,
      ),
    ).toBe(READER_ROUTE_CONTENT_CONVERGENCE_REASONS.placeholderCopy);

    expect(
      assertHomeRouteContentConvergence("<html>Model Atlas lorem ipsum</html>"),
    ).toBe(READER_ROUTE_CONTENT_CONVERGENCE_REASONS.loremPlaceholder);
  });
});

describe("assertSearchRouteContentConvergence", () => {
  test("passes on Phase 1 search content markers", () => {
    expect(assertSearchRouteContentConvergence(PASSING_SEARCH_HTML)).toBeNull();
  });

  test("fails when Search marker is missing", () => {
    expect(
      assertSearchRouteContentConvergence("<html><h1>Find things</h1></html>"),
    ).toBe(READER_ROUTE_CONTENT_CONVERGENCE_REASONS.missingSearchTitle);
  });

  test("fails on placeholder scaffold and lorem copy", () => {
    expect(
      assertSearchRouteContentConvergence(
        `<html>Search<p>${PLACEHOLDER_SIDEBAR_DESCRIPTION}</p></html>`,
      ),
    ).toBe(READER_ROUTE_CONTENT_CONVERGENCE_REASONS.placeholderCopy);

    expect(
      assertSearchRouteContentConvergence("<html>Search lorem ipsum</html>"),
    ).toBe(READER_ROUTE_CONTENT_CONVERGENCE_REASONS.loremPlaceholder);
  });
});
