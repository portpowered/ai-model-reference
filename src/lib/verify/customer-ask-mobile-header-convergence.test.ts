import { describe, expect, test } from "bun:test";
import {
  PRIMARY_NAV_DESKTOP_CLASS,
  PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS,
} from "@/components/layout/primary-nav";
import { BATCH_012_MOBILE_HEADER_CHECKS } from "./batch-012-mobile-header-checks";
import {
  assertMobileHamburgerMenuConvergence,
  buildCustomerAskMobileHeaderRow,
  MOBILE_HEADER_CUSTOMER_ASK_REASONS,
} from "./customer-ask-mobile-header-convergence";

const HEADER_SEARCH_TRIGGER = `
  <button data-search="" aria-label="Open search" class="group">
    <span>Search</span>
    <kbd>⌘</kbd>
    <kbd>K</kbd>
  </button>
`;

export const POST_REPAIR_MOBILE_HEADER_HOME_HTML = `
  <header class="border-b border-border">
    <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
      <button
        type="button"
        class="${PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS}"
        aria-expanded="false"
        aria-controls="mobile-nav-panel"
        aria-label="Open menu"
      >
        <svg aria-hidden="true"></svg>
      </button>
      <nav class="${PRIMARY_NAV_DESKTOP_CLASS}" aria-label="Primary">
        <a href="/">Home</a>
        <a href="/docs/architecture">Architecture</a>
        <a href="/docs/glossary">Glossary</a>
        <a href="/tags">Tags</a>
      </nav>
      ${HEADER_SEARCH_TRIGGER}
    </div>
  </header>
  <main>
    <article>
      <h1>Model Atlas</h1>
      <p>Model Atlas intro without inline search handoff.</p>
    </article>
  </main>
`;

export const PRE_REPAIR_INLINE_FULL_NAV_HOME_HTML = `
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

const MISSING_MENU_BUTTON_HTML = `
  <header>
    <nav class="${PRIMARY_NAV_DESKTOP_CLASS}" aria-label="Primary">
      <a href="/">Home</a>
    </nav>
  </header>
`;

describe("assertMobileHamburgerMenuConvergence", () => {
  test("passes when post-repair markup exposes disclosure menu and responsive desktop nav", () => {
    expect(
      assertMobileHamburgerMenuConvergence(POST_REPAIR_MOBILE_HEADER_HOME_HTML),
    ).toBeNull();
  });

  test("fails when pre-repair inline full primary navigation is still present", () => {
    expect(
      assertMobileHamburgerMenuConvergence(
        PRE_REPAIR_INLINE_FULL_NAV_HOME_HTML,
      ),
    ).toBe(MOBILE_HEADER_CUSTOMER_ASK_REASONS.inlineFullNavVisible);
  });

  test("fails when the mobile menu button is missing", () => {
    expect(assertMobileHamburgerMenuConvergence(MISSING_MENU_BUTTON_HTML)).toBe(
      MOBILE_HEADER_CUSTOMER_ASK_REASONS.missingMobileMenuButton,
    );
  });
});

describe("buildCustomerAskMobileHeaderRow", () => {
  test("returns pass row for post-repair home HTML", () => {
    expect(
      buildCustomerAskMobileHeaderRow(POST_REPAIR_MOBILE_HEADER_HOME_HTML),
    ).toEqual({
      checkId: BATCH_012_MOBILE_HEADER_CHECKS.mobileHamburgerMenu.checkId,
      title: BATCH_012_MOBILE_HEADER_CHECKS.mobileHamburgerMenu.title,
      status: "pass",
      route: "/",
      checklistRow: "phase-1-header-bar",
    });
  });

  test("returns fail row for pre-repair inline full nav HTML", () => {
    const row = buildCustomerAskMobileHeaderRow(
      PRE_REPAIR_INLINE_FULL_NAV_HOME_HTML,
    );
    expect(row.status).toBe("fail");
    expect(row.reason).toBe(
      MOBILE_HEADER_CUSTOMER_ASK_REASONS.inlineFullNavVisible,
    );
    expect(row.checklistRow).toBe("phase-1-header-bar");
  });
});
