import { describe, expect, test } from "bun:test";
import {
  assertHomeSearchEntryConvergence,
  HOME_SEARCH_ENTRY_CONVERGENCE_REASONS,
  REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE,
} from "./home-search-entry-convergence";

const HEADER_SEARCH_TRIGGER =
  '<button data-search="" aria-label="Open search">Search</button>';

const POST_DEDUP_HOME_HTML = `
  <header>
    <nav aria-label="Primary">Model Atlas</nav>
    ${HEADER_SEARCH_TRIGGER}
  </header>
  <main>
    <article>
      <h1>Model Atlas</h1>
      <p>Model Atlas intro without inline search handoff.</p>
      <section id="browse" aria-labelledby="home-browse-heading">
        <h2 id="home-browse-heading">Browse</h2>
      </section>
    </article>
  </main>
`;

const LEGACY_ARTICLE_SEARCH_HANDOFF_HTML = `
  <header>
    <nav aria-label="Primary">Model Atlas</nav>
    ${HEADER_SEARCH_TRIGGER}
  </header>
  <main>
    <article>
      <h1>Model Atlas</h1>
      <p>Use the header search.
        <a href="/search">Search entry page</a>
      </p>
    </article>
  </main>
`;

const PRE_REPAIR_HOME_HTML = `
  <header>
    <nav aria-label="Primary">Model Atlas</nav>
    ${HEADER_SEARCH_TRIGGER}
  </header>
  <main>
    <article>
      <h1>Model Atlas</h1>
      <section id="search" aria-labelledby="home-search-heading">
        <h2 id="home-search-heading">${REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE}</h2>
        <input data-search="" aria-label="Search Model Atlas" />
      </section>
    </article>
  </main>
`;

describe("assertHomeSearchEntryConvergence", () => {
  test("passes on post-dedup home fixtures with header-only search entry", () => {
    expect(assertHomeSearchEntryConvergence(POST_DEDUP_HOME_HTML)).toBeNull();
  });

  test("fails pre-repair fixtures with header plus inline search section", () => {
    expect(assertHomeSearchEntryConvergence(PRE_REPAIR_HOME_HTML)).toBe(
      HOME_SEARCH_ENTRY_CONVERGENCE_REASONS.redundantInlineSearchHeading,
    );
  });

  test("reports missing Model Atlas and global search independently", () => {
    expect(
      assertHomeSearchEntryConvergence(
        POST_DEDUP_HOME_HTML.replace(/Model Atlas/g, "Other Site"),
      ),
    ).toBe(HOME_SEARCH_ENTRY_CONVERGENCE_REASONS.missingModelAtlas);

    expect(
      assertHomeSearchEntryConvergence(
        POST_DEDUP_HOME_HTML.replace(HEADER_SEARCH_TRIGGER, ""),
      ),
    ).toBe(HOME_SEARCH_ENTRY_CONVERGENCE_REASONS.missingGlobalSearchEntry);
  });

  test("fails when the article still includes an inline /search handoff link", () => {
    expect(
      assertHomeSearchEntryConvergence(LEGACY_ARTICLE_SEARCH_HANDOFF_HTML),
    ).toBe(
      HOME_SEARCH_ENTRY_CONVERGENCE_REASONS.redundantArticleSearchPageLink,
    );
  });

  test("detects redundant inline search section anchor and trigger without removed heading", () => {
    const inlineSectionOnly = PRE_REPAIR_HOME_HTML.replace(
      `<h2 id="home-search-heading">${REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE}</h2>`,
      "<h2>Find pages</h2>",
    );
    expect(assertHomeSearchEntryConvergence(inlineSectionOnly)).toBe(
      HOME_SEARCH_ENTRY_CONVERGENCE_REASONS.redundantInlineSearchSection,
    );

    const inlineTriggerOnly = `
      <header>${HEADER_SEARCH_TRIGGER}</header>
      <article>
        <h1>Model Atlas</h1>
        <button data-search="">Inline</button>
      </article>
    `;
    expect(assertHomeSearchEntryConvergence(inlineTriggerOnly)).toBe(
      HOME_SEARCH_ENTRY_CONVERGENCE_REASONS.redundantInlineSearchTrigger,
    );
  });
});
