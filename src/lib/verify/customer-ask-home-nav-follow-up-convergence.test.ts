import { describe, expect, test } from "bun:test";
import {
  BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS,
  BATCH_011_FOLLOW_UP_HOME_ROUTE,
  BATCH_011_FOLLOW_UP_NAV_ROUTE,
} from "./batch-011-follow-up-home-nav-checks";
import {
  buildCustomerAskHomeHeaderRows,
  HOME_HEADER_CUSTOMER_ASK_CHECKS,
} from "./customer-ask-home-header-convergence";
import {
  assertHomeBrevityConvergence,
  assertHomeBrowseLinksConvergence,
  assertNavNoBrokenThemeToggleConvergence,
  buildCustomerAskHomeFollowUpRows,
  buildCustomerAskHomeNavFollowUpRows,
  buildCustomerAskNavThemeFollowUpRow,
  HOME_NAV_FOLLOW_UP_CUSTOMER_ASK_REASONS,
} from "./customer-ask-home-nav-follow-up-convergence";
import { REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE } from "./home-search-entry-convergence";

const HEADER_SEARCH_TRIGGER = `
  <button data-search="" aria-label="Open search" class="group">
    <span>Search</span>
    <kbd class="group-hover:text-accent-foreground group-hover:bg-accent-foreground/10">⌘</kbd>
    <kbd class="group-hover:text-accent-foreground group-hover:bg-accent-foreground/10">K</kbd>
  </button>
`;

const POST_REPAIR_BROWSE_SECTION = `
  <section id="browse" aria-labelledby="home-browse-heading">
    <h2 id="home-browse-heading">Browse</h2>
    <ul class="mt-4 flex list-none flex-col gap-3" aria-label="Browse">
      <li>
        <a href="/tags" class="no-underline hover:no-underline">Tags</a>
      </li>
    </ul>
  </section>
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
      <header class="relative overflow-hidden rounded-lg px-6 py-10">
        <h1>Model Atlas</h1>
        <p>Reference</p>
      </header>
      <p>Model Atlas intro without inline search handoff.</p>
      ${POST_REPAIR_BROWSE_SECTION}
    </article>
  </main>
`;

const PRE_REPAIR_BRUSH_MARGIN_HTML = `
  <main>
    <article>
      <header class="relative mb-8 overflow-hidden rounded-lg px-6 py-10">
        <h1>Model Atlas</h1>
      </header>
      ${POST_REPAIR_BROWSE_SECTION}
    </article>
  </main>
`;

const PRE_REPAIR_INLINE_SEARCH_HTML = `
  <main>
    <article>
      <header class="relative overflow-hidden rounded-lg px-6 py-10">
        <h1>Model Atlas</h1>
      </header>
      <section id="search" aria-labelledby="home-search-heading">
        <h2 id="home-search-heading">${REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE}</h2>
      </section>
      ${POST_REPAIR_BROWSE_SECTION}
    </article>
  </main>
`;

const PRE_REPAIR_BROWSE_LIST_DISC_HTML = `
  <main>
    <article>
      <header class="relative overflow-hidden rounded-lg px-6 py-10">
        <h1>Model Atlas</h1>
      </header>
      <section id="browse" aria-labelledby="home-browse-heading">
        <h2 id="home-browse-heading">Browse</h2>
        <ul class="mt-4 flex list-disc flex-col gap-3" aria-label="Browse">
          <li><a href="/tags" class="no-underline hover:no-underline">Tags</a></li>
        </ul>
      </section>
    </article>
  </main>
`;

const PRE_REPAIR_BROWSE_UNDERLINE_HTML = `
  <main>
    <article>
      <header class="relative overflow-hidden rounded-lg px-6 py-10">
        <h1>Model Atlas</h1>
      </header>
      <section id="browse" aria-labelledby="home-browse-heading">
        <h2 id="home-browse-heading">Browse</h2>
        <ul class="mt-4 flex list-none flex-col gap-3" aria-label="Browse">
          <li><a href="/tags" class="underline hover:underline">Tags</a></li>
        </ul>
      </section>
    </article>
  </main>
`;

const POST_REPAIR_DOCS_SHELL_HTML = `
  <div id="nd-sidebar" aria-label="Docs sidebar">
    <a href="/docs/glossary/token">Token</a>
  </div>
  <div id="nd-page"><article>GQA module</article></div>
`;

const PRE_REPAIR_THEME_TOGGLE_HTML = `
  <div id="nd-sidebar" aria-label="Docs sidebar">
    <button data-theme-toggle="" aria-label="Toggle Theme">Theme</button>
  </div>
  <div id="nd-page"><article>GQA module</article></div>
`;

describe("assertHomeBrevityConvergence", () => {
  test("passes for post-repair home brush header and article copy", () => {
    expect(assertHomeBrevityConvergence(POST_REPAIR_HOME_HTML)).toBeNull();
  });

  test("fails when brush header still carries mb-8", () => {
    expect(assertHomeBrevityConvergence(PRE_REPAIR_BRUSH_MARGIN_HTML)).toBe(
      HOME_NAV_FOLLOW_UP_CUSTOMER_ASK_REASONS.excessBrushHeaderMargin,
    );
  });

  test("fails when verbose inline search section markers remain", () => {
    expect(assertHomeBrevityConvergence(PRE_REPAIR_INLINE_SEARCH_HTML)).toBe(
      HOME_NAV_FOLLOW_UP_CUSTOMER_ASK_REASONS.verboseInlineSearchHeading,
    );
  });
});

describe("assertHomeBrowseLinksConvergence", () => {
  test("passes when browse lists use list-none and no-underline links", () => {
    expect(assertHomeBrowseLinksConvergence(POST_REPAIR_HOME_HTML)).toBeNull();
  });

  test("fails when browse lists render list-disc", () => {
    expect(
      assertHomeBrowseLinksConvergence(PRE_REPAIR_BROWSE_LIST_DISC_HTML),
    ).toBe(HOME_NAV_FOLLOW_UP_CUSTOMER_ASK_REASONS.browseListDisc);
  });

  test("fails when browse links keep persistent underline styling", () => {
    expect(
      assertHomeBrowseLinksConvergence(PRE_REPAIR_BROWSE_UNDERLINE_HTML),
    ).toBe(
      HOME_NAV_FOLLOW_UP_CUSTOMER_ASK_REASONS.persistentBrowseLinkUnderline,
    );
  });
});

describe("assertNavNoBrokenThemeToggleConvergence", () => {
  test("passes when docs sidebar omits theme toggle controls", () => {
    expect(
      assertNavNoBrokenThemeToggleConvergence(POST_REPAIR_DOCS_SHELL_HTML),
    ).toBeNull();
  });

  test("fails when docs sidebar still exposes data-theme-toggle", () => {
    expect(
      assertNavNoBrokenThemeToggleConvergence(PRE_REPAIR_THEME_TOGGLE_HTML),
    ).toBe(HOME_NAV_FOLLOW_UP_CUSTOMER_ASK_REASONS.brokenThemeTogglePresent);
  });
});

describe("buildCustomerAskHomeFollowUpRows", () => {
  test("returns pass rows for post-repair home HTML", () => {
    const rows = buildCustomerAskHomeFollowUpRows(POST_REPAIR_HOME_HTML);
    expect(rows.map((row) => row.checkId)).toEqual([
      BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.homeBrevity.checkId,
      BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.homeBrowseLinks.checkId,
    ]);
    expect(rows.every((row) => row.status === "pass")).toBe(true);
    expect(
      rows.every((row) => row.route === BATCH_011_FOLLOW_UP_HOME_ROUTE),
    ).toBe(true);
    expect(
      rows.every((row) => row.checklistRow === "phase-1-home-header-polish"),
    ).toBe(true);
  });

  test("fails brevity and browse-link checks independently", () => {
    const brevityRows = buildCustomerAskHomeFollowUpRows(
      PRE_REPAIR_BRUSH_MARGIN_HTML,
    );
    expect(brevityRows[0]?.status).toBe("fail");
    expect(brevityRows[1]?.status).toBe("pass");

    const browseRows = buildCustomerAskHomeFollowUpRows(
      PRE_REPAIR_BROWSE_LIST_DISC_HTML,
    );
    expect(browseRows[0]?.status).toBe("pass");
    expect(browseRows[1]?.status).toBe("fail");
  });
});

describe("buildCustomerAskNavThemeFollowUpRow", () => {
  test("returns pass row for post-repair docs shell HTML", () => {
    const row = buildCustomerAskNavThemeFollowUpRow(
      POST_REPAIR_DOCS_SHELL_HTML,
    );
    expect(row).toEqual({
      checkId:
        BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.navNoBrokenThemeToggle.checkId,
      title: BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.navNoBrokenThemeToggle.title,
      status: "pass",
      route: BATCH_011_FOLLOW_UP_NAV_ROUTE,
      checklistRow: "phase-1-home-header-polish",
    });
  });
});

describe("buildCustomerAskHomeNavFollowUpRows", () => {
  test("aggregates home and nav follow-up rows", () => {
    const rows = buildCustomerAskHomeNavFollowUpRows({
      homeHtml: POST_REPAIR_HOME_HTML,
      navHtml: POST_REPAIR_DOCS_SHELL_HTML,
    });

    expect(rows.map((row) => row.checkId)).toEqual([
      BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.homeBrevity.checkId,
      BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.homeBrowseLinks.checkId,
      BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS.navNoBrokenThemeToggle.checkId,
    ]);
    expect(rows.every((row) => row.status === "pass")).toBe(true);
  });
});

describe("post-repair home follow-up preserves batch-008 home/header rows", () => {
  test("existing header-only search and Command-K rows still pass", () => {
    const rows = buildCustomerAskHomeHeaderRows(POST_REPAIR_HOME_HTML);
    expect(
      rows.filter((row) => row.status === "pass").map((row) => row.checkId),
    ).toEqual([
      HOME_HEADER_CUSTOMER_ASK_CHECKS.headerSearchEntry.checkId,
      HOME_HEADER_CUSTOMER_ASK_CHECKS.primaryNavNoDuplicateSearch.checkId,
      HOME_HEADER_CUSTOMER_ASK_CHECKS.commandKAffordance.checkId,
      HOME_HEADER_CUSTOMER_ASK_CHECKS.commandKHoverContrast.checkId,
    ]);
  });
});
