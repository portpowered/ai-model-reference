import { describe, expect, test } from "bun:test";
import {
  GROUPED_QUERY_ATTENTION_URL,
  PLACEHOLDER_SIDEBAR_DESCRIPTION,
  TOKEN_GLOSSARY_URL,
} from "@/lib/navigation/docs-sidebar-contract";
import {
  ATTENTION_TAG_LANDING_PATH,
  ATTENTION_TAG_SCOPED_SEARCH_URL,
  assertTagsAttentionNavigationConvergence,
  assertTagsIndexNavigationConvergence,
  TAGS_NAVIGATION_CONVERGENCE_REASONS,
} from "./tags-navigation-convergence";

const PRIMARY_NAV = '<nav aria-label="Primary">Model Atlas</nav>';

const PASSING_TAGS_INDEX_HTML = `
  <header>${PRIMARY_NAV}</header>
  <main>
    <h1>Tags</h1>
    <a href="${ATTENTION_TAG_LANDING_PATH}">Attention</a>
  </main>
`;

const PASSING_ATTENTION_TAG_HTML = `
  <header>${PRIMARY_NAV}</header>
  <main>
    <h1>Attention</h1>
    <a href="${GROUPED_QUERY_ATTENTION_URL}">Grouped-Query Attention</a>
    <a href="${TOKEN_GLOSSARY_URL}">Token</a>
    <a href="${ATTENTION_TAG_SCOPED_SEARCH_URL}">Search tagged content</a>
  </main>
`;

describe("assertTagsIndexNavigationConvergence", () => {
  test("passes without requiring Fumadocs nd-sidebar regions", () => {
    expect(
      assertTagsIndexNavigationConvergence(PASSING_TAGS_INDEX_HTML),
    ).toBeNull();
  });

  test("fails when primary navigation is missing", () => {
    expect(
      assertTagsIndexNavigationConvergence(
        '<html><h1>Tags</h1><a href="/tags/attention">Attention</a></html>',
      ),
    ).toBe(TAGS_NAVIGATION_CONVERGENCE_REASONS.missingPrimaryNav);
  });

  test("fails when tag navigation markers are missing", () => {
    expect(
      assertTagsIndexNavigationConvergence(
        `<html>${PRIMARY_NAV}<h1>Wrong</h1></html>`,
      ),
    ).toBe(TAGS_NAVIGATION_CONVERGENCE_REASONS.missingTagsTitle);

    expect(
      assertTagsIndexNavigationConvergence(
        `<html>${PRIMARY_NAV}<h1>Tags</h1></html>`,
      ),
    ).toBe(TAGS_NAVIGATION_CONVERGENCE_REASONS.missingAttentionTagLink);
  });
});

describe("assertTagsAttentionNavigationConvergence", () => {
  test("passes on sample module, token glossary, and tag-scoped search links", () => {
    expect(
      assertTagsAttentionNavigationConvergence(PASSING_ATTENTION_TAG_HTML),
    ).toBeNull();
  });

  test("fails when primary navigation is missing", () => {
    expect(
      assertTagsAttentionNavigationConvergence(
        `<html><h1>Attention</h1><a href="${GROUPED_QUERY_ATTENTION_URL}">GQA</a></html>`,
      ),
    ).toBe(TAGS_NAVIGATION_CONVERGENCE_REASONS.missingPrimaryNav);
  });

  test("fails when attention landing links are missing", () => {
    expect(
      assertTagsAttentionNavigationConvergence(
        `<html>${PRIMARY_NAV}<h1>Wrong</h1></html>`,
      ),
    ).toBe(TAGS_NAVIGATION_CONVERGENCE_REASONS.missingAttentionTitle);

    const missingModuleHtml = PASSING_ATTENTION_TAG_HTML.replace(
      GROUPED_QUERY_ATTENTION_URL,
      "/docs/modules/other",
    );
    expect(assertTagsAttentionNavigationConvergence(missingModuleHtml)).toBe(
      TAGS_NAVIGATION_CONVERGENCE_REASONS.missingSampleModuleLink,
    );

    const missingTokenHtml = PASSING_ATTENTION_TAG_HTML.replace(
      TOKEN_GLOSSARY_URL,
      "/docs/glossary/other",
    );
    expect(assertTagsAttentionNavigationConvergence(missingTokenHtml)).toBe(
      TAGS_NAVIGATION_CONVERGENCE_REASONS.missingTokenGlossaryLink,
    );

    const missingSearchHtml = PASSING_ATTENTION_TAG_HTML.replace(
      ATTENTION_TAG_SCOPED_SEARCH_URL,
      "/search",
    );
    expect(assertTagsAttentionNavigationConvergence(missingSearchHtml)).toBe(
      TAGS_NAVIGATION_CONVERGENCE_REASONS.missingTagScopedSearchLink,
    );
  });

  test("fails on placeholder scaffold and lorem copy", () => {
    expect(
      assertTagsAttentionNavigationConvergence(
        `${PASSING_ATTENTION_TAG_HTML}<p>${PLACEHOLDER_SIDEBAR_DESCRIPTION}</p>`,
      ),
    ).toBe(TAGS_NAVIGATION_CONVERGENCE_REASONS.placeholderCopy);

    expect(
      assertTagsAttentionNavigationConvergence(
        `${PASSING_ATTENTION_TAG_HTML} lorem ipsum`,
      ),
    ).toBe(TAGS_NAVIGATION_CONVERGENCE_REASONS.loremPlaceholder);
  });
});
