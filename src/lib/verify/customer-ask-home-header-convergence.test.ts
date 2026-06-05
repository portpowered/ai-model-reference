import { describe, expect, test } from "bun:test";
import {
  assertCommandKShortcutReadable,
  assertPrimaryNavNoDuplicateSearchLink,
  buildCustomerAskHomeHeaderRows,
  evaluateCommandKHoverContrastRow,
  HOME_HEADER_CUSTOMER_ASK_CHECKS,
  HOME_HEADER_CUSTOMER_ASK_REASONS,
} from "./customer-ask-home-header-convergence";
import {
  HOME_SEARCH_ENTRY_CONVERGENCE_REASONS,
  REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE,
} from "./home-search-entry-convergence";

const HEADER_SEARCH_TRIGGER = `
  <button data-search="" aria-label="Open search" class="group">
    <span>Search</span>
    <kbd class="group-hover:text-accent-foreground group-hover:bg-accent-foreground/10">⌘</kbd>
    <kbd class="group-hover:text-accent-foreground group-hover:bg-accent-foreground/10">K</kbd>
  </button>
`;

const POST_REPAIR_HOME_HTML = `
  <header>
    <nav aria-label="Primary">
      <a href="/">Home</a>
      <a href="/docs/architecture">Architecture</a>
      <a href="/docs/glossary">Glossary</a>
      <a href="/tags">Tags</a>
    </nav>
    ${HEADER_SEARCH_TRIGGER}
  </header>
  <main>
    <article>
      <h1>Model Atlas</h1>
      <p>Model Atlas intro without inline search handoff.</p>
    </article>
  </main>
`;

const PRE_REPAIR_INLINE_SEARCH_HTML = `
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

const PRE_REPAIR_NAV_SEARCH_LINK_HTML = `
  <header>
    <nav aria-label="Primary">
      <a href="/">Home</a>
      <a href="/search">Search</a>
      <a href="/tags">Tags</a>
    </nav>
    ${HEADER_SEARCH_TRIGGER}
  </header>
  <main>
    <article>
      <h1>Model Atlas</h1>
      <p>Model Atlas intro without inline search handoff.</p>
    </article>
  </main>
`;

const MISSING_KBD_HTML = `
  <header>
    <nav aria-label="Primary">
      <a href="/">Home</a>
    </nav>
    <button data-search="" aria-label="Open search">Search</button>
  </header>
  <main>
    <article>
      <h1>Model Atlas</h1>
    </article>
  </main>
`;

describe("assertPrimaryNavNoDuplicateSearchLink", () => {
  test("passes when primary navigation omits /search", () => {
    expect(
      assertPrimaryNavNoDuplicateSearchLink(POST_REPAIR_HOME_HTML),
    ).toBeNull();
  });

  test("fails when primary navigation still links to /search", () => {
    expect(
      assertPrimaryNavNoDuplicateSearchLink(PRE_REPAIR_NAV_SEARCH_LINK_HTML),
    ).toBe(HOME_HEADER_CUSTOMER_ASK_REASONS.redundantPrimaryNavSearchLink);
  });

  test("allows scoped search handoffs outside primary navigation", () => {
    const html = `
      ${POST_REPAIR_HOME_HTML}
      <a href="/search?tag=attention">Search attention</a>
    `;
    expect(assertPrimaryNavNoDuplicateSearchLink(html)).toBeNull();
  });
});

describe("assertCommandKShortcutReadable", () => {
  test("passes when header search trigger includes kbd shortcut chips", () => {
    expect(assertCommandKShortcutReadable(POST_REPAIR_HOME_HTML)).toBeNull();
  });

  test("fails when kbd shortcut chips are missing", () => {
    expect(assertCommandKShortcutReadable(MISSING_KBD_HTML)).toBe(
      HOME_HEADER_CUSTOMER_ASK_REASONS.missingKbdShortcutChips,
    );
  });
});

describe("evaluateCommandKHoverContrastRow", () => {
  test("passes when group-hover accent classes are present in markup", () => {
    expect(evaluateCommandKHoverContrastRow(POST_REPAIR_HOME_HTML)).toEqual({
      checkId: HOME_HEADER_CUSTOMER_ASK_CHECKS.commandKHoverContrast.checkId,
      title: HOME_HEADER_CUSTOMER_ASK_CHECKS.commandKHoverContrast.title,
      status: "pass",
      route: "/",
      checklistRow: "phase-1-home-header-polish",
    });
  });

  test("reports uncertain when hover styles are not observable from static HTML", () => {
    expect(evaluateCommandKHoverContrastRow(MISSING_KBD_HTML)).toEqual({
      checkId: HOME_HEADER_CUSTOMER_ASK_CHECKS.commandKHoverContrast.checkId,
      title: HOME_HEADER_CUSTOMER_ASK_CHECKS.commandKHoverContrast.title,
      status: "uncertain",
      route: "/",
      reason: "hover color not observable from static HTML",
      checklistRow: "phase-1-home-header-polish",
    });
  });
});

describe("buildCustomerAskHomeHeaderRows", () => {
  test("returns all pass rows for post-repair home HTML", () => {
    const rows = buildCustomerAskHomeHeaderRows(POST_REPAIR_HOME_HTML);
    expect(rows.map((row) => row.checkId)).toEqual([
      HOME_HEADER_CUSTOMER_ASK_CHECKS.headerSearchEntry.checkId,
      HOME_HEADER_CUSTOMER_ASK_CHECKS.primaryNavNoDuplicateSearch.checkId,
      HOME_HEADER_CUSTOMER_ASK_CHECKS.commandKAffordance.checkId,
      HOME_HEADER_CUSTOMER_ASK_CHECKS.commandKHoverContrast.checkId,
    ]);
    expect(
      rows.every((row) => row.checklistRow === "phase-1-home-header-polish"),
    ).toBe(true);
    expect(
      rows.filter((row) => row.status === "pass").map((row) => row.checkId),
    ).toEqual([
      HOME_HEADER_CUSTOMER_ASK_CHECKS.headerSearchEntry.checkId,
      HOME_HEADER_CUSTOMER_ASK_CHECKS.primaryNavNoDuplicateSearch.checkId,
      HOME_HEADER_CUSTOMER_ASK_CHECKS.commandKAffordance.checkId,
      HOME_HEADER_CUSTOMER_ASK_CHECKS.commandKHoverContrast.checkId,
    ]);
  });

  test("fails header search entry on pre-repair inline search section", () => {
    const rows = buildCustomerAskHomeHeaderRows(PRE_REPAIR_INLINE_SEARCH_HTML);
    const headerRow = rows.find(
      (row) =>
        row.checkId ===
        HOME_HEADER_CUSTOMER_ASK_CHECKS.headerSearchEntry.checkId,
    );
    expect(headerRow?.status).toBe("fail");
    expect(headerRow?.reason).toBe(
      HOME_SEARCH_ENTRY_CONVERGENCE_REASONS.redundantInlineSearchHeading,
    );
  });

  test("fails primary navigation duplicate search link check independently", () => {
    const rows = buildCustomerAskHomeHeaderRows(
      PRE_REPAIR_NAV_SEARCH_LINK_HTML,
    );
    const navRow = rows.find(
      (row) =>
        row.checkId ===
        HOME_HEADER_CUSTOMER_ASK_CHECKS.primaryNavNoDuplicateSearch.checkId,
    );
    expect(navRow?.status).toBe("fail");
    expect(navRow?.reason).toBe(
      HOME_HEADER_CUSTOMER_ASK_REASONS.redundantPrimaryNavSearchLink,
    );
  });
});
