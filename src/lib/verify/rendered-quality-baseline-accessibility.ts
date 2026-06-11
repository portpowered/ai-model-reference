import type { Page } from "playwright";
import {
  ATTENTION_TAG_ACCESSIBILITY_ROUTE,
  GQA_ACCESSIBILITY_ROUTE,
  SEARCH_ACCESSIBILITY_ROUTE,
  TAGS_INDEX_ACCESSIBILITY_ROUTE,
} from "./rendered-quality-accessibility-convergence";
import type {
  RenderedQualityAuditRoute,
  RenderedQualityIssue,
  RenderedQualityViewportId,
} from "./rendered-quality-baseline";
import {
  DEFAULT_ACCESSIBILITY_QUERY,
  DEFAULT_EMPTY_STATE_QUERY,
  evaluateSearchPageEmptyState,
  evaluateSearchPageResultsAccessibility,
  readSearchPageEmptyStateSnapshot,
  readSearchPageResultsAccessibilitySnapshot,
} from "./static-export-search-empty-error-states-http";
import {
  SEARCH_PAGE_EMPTY_SELECTOR,
  SEARCH_PAGE_INPUT_SELECTOR,
  SEARCH_PAGE_RESULTS_SELECTOR,
} from "./static-export-search-input-hydration-http";

export const ACCESSIBILITY_AUDIT_ROUTES: readonly RenderedQualityAuditRoute[] =
  [
    { path: SEARCH_ACCESSIBILITY_ROUTE, label: "search", kind: "search" },
    {
      path: TAGS_INDEX_ACCESSIBILITY_ROUTE,
      label: "tags index",
      kind: "tags-index",
    },
    {
      path: ATTENTION_TAG_ACCESSIBILITY_ROUTE,
      label: "attention tag landing",
      kind: "tag-landing",
    },
    {
      path: GQA_ACCESSIBILITY_ROUTE,
      label: "grouped-query-attention",
      kind: "module",
    },
  ] as const;

export type KeyboardFocusProbe = {
  focusable: boolean;
  focusRingVisible: boolean;
};

export type SearchKeyboardAccessibilityProbe = {
  route: RenderedQualityAuditRoute;
  viewport: RenderedQualityViewportId;
  inputFocusable: boolean;
  resultsFocusable: boolean;
  emptySuggestionFocusable: boolean;
  errorDetail?: string;
};

export type LinkKeyboardAccessibilityProbe = {
  route: RenderedQualityAuditRoute;
  viewport: RenderedQualityViewportId;
  linkFocusable: boolean;
  focusRingVisible: boolean;
  errorDetail?: string;
};

export type GqaKeyboardAccessibilityProbe = {
  route: RenderedQualityAuditRoute;
  viewport: RenderedQualityViewportId;
  switcherActivated: boolean;
  tocLinkFocusable: boolean;
  sidebarLinkFocusable: boolean;
  errorDetail?: string;
};

const FOCUS_RING_MIN_PX = 1;

function withVisibleSelector(selector: string): string {
  return selector.includes(":visible") ? selector : `${selector}:visible`;
}

async function readFocusRingVisible(
  page: Page,
  selector: string,
): Promise<KeyboardFocusProbe> {
  const target = page.locator(withVisibleSelector(selector)).first();
  if ((await target.count()) === 0) {
    return { focusable: false, focusRingVisible: false };
  }

  await target.focus();
  const metrics = await target.evaluate((element) => {
    const style = getComputedStyle(element);
    const outlineWidth = Number.parseFloat(style.outlineWidth) || 0;
    const boxShadow = style.boxShadow;
    const hasRingShadow = boxShadow !== "none" && boxShadow.includes("rgb");
    return {
      focusable: element === document.activeElement,
      focusRingVisible:
        outlineWidth >= 1 || hasRingShadow || style.outlineStyle !== "none",
    };
  });

  return metrics;
}

async function openMobilePrimaryNavigation(page: Page): Promise<void> {
  const menuButton = page.getByRole("button", { name: "Open menu" });
  if ((await menuButton.count()) === 0) {
    return;
  }

  if ((await menuButton.getAttribute("aria-expanded")) !== "true") {
    await menuButton.click();
    await page.waitForTimeout(250);
  }
}

async function openMobileTocPopover(page: Page): Promise<void> {
  const visibleTocLinks = page.locator('#nd-toc a[href^="#"]:visible');
  if ((await visibleTocLinks.count()) > 0) {
    return;
  }

  const tocToggle = page
    .locator("button")
    .filter({ hasText: /What It Is|On this page/i })
    .first();
  if ((await tocToggle.count()) === 0) {
    return;
  }

  await tocToggle.click();
  await page.waitForTimeout(250);
}

async function probeDocsSidebarLinkFocus(
  page: Page,
  viewport: RenderedQualityViewportId,
): Promise<KeyboardFocusProbe> {
  if (viewport === "mobile") {
    await openMobilePrimaryNavigation(page);
    return readFocusRingVisible(page, 'nav[aria-label="Primary"] a');
  }

  return readFocusRingVisible(page, "#nd-sidebar a:visible");
}

async function probeDocsTocLinkFocus(
  page: Page,
  viewport: RenderedQualityViewportId,
): Promise<KeyboardFocusProbe> {
  if (viewport === "mobile") {
    await openMobileTocPopover(page);
    const mobileTocProbe = await readFocusRingVisible(
      page,
      'a[href^="#what-it-is"]',
    );
    if (mobileTocProbe.focusable) {
      return mobileTocProbe;
    }

    return readFocusRingVisible(page, 'a[href^="#"]:visible');
  }

  return readFocusRingVisible(page, '#nd-toc a[href^="#"]:visible');
}

function pushProbeFailure(
  issues: RenderedQualityIssue[],
  probe: {
    route: RenderedQualityAuditRoute;
    viewport: RenderedQualityViewportId;
    behavior: string;
    detail: string;
  },
): RenderedQualityIssue[] {
  issues.push({
    route: probe.route.path,
    routeLabel: probe.route.label,
    viewport: probe.viewport,
    lane: "accessibility",
    behavior: probe.behavior,
    detail: probe.detail,
  });
  return issues;
}

/**
 * Returns accessibility issues when hydrated search keyboard navigation fails.
 */
export function auditSearchKeyboardAccessibility(
  probe: SearchKeyboardAccessibilityProbe,
): RenderedQualityIssue[] {
  if (probe.errorDetail) {
    return [
      {
        route: probe.route.path,
        routeLabel: probe.route.label,
        viewport: probe.viewport,
        lane: "accessibility",
        behavior: "search keyboard probe",
        detail: probe.errorDetail,
      },
    ];
  }

  const issues: RenderedQualityIssue[] = [];

  if (!probe.inputFocusable) {
    pushProbeFailure(issues, {
      ...probe,
      behavior: "search input focus",
      detail: "search input is not keyboard focusable on /search",
    });
  }

  if (!probe.resultsFocusable) {
    pushProbeFailure(issues, {
      ...probe,
      behavior: "search results focus",
      detail: "first search result row is not keyboard focusable on /search",
    });
  }

  if (!probe.emptySuggestionFocusable) {
    pushProbeFailure(issues, {
      ...probe,
      behavior: "search empty suggestion focus",
      detail: "empty-state GQA suggestion control is not keyboard focusable",
    });
  }

  return issues;
}

/**
 * Returns accessibility issues when tag navigation links fail keyboard focus checks.
 */
export function auditLinkKeyboardAccessibility(
  probe: LinkKeyboardAccessibilityProbe,
): RenderedQualityIssue[] {
  if (probe.errorDetail) {
    return [
      {
        route: probe.route.path,
        routeLabel: probe.route.label,
        viewport: probe.viewport,
        lane: "accessibility",
        behavior: "tag link keyboard probe",
        detail: probe.errorDetail,
      },
    ];
  }

  const issues: RenderedQualityIssue[] = [];

  if (!probe.linkFocusable) {
    pushProbeFailure(issues, {
      ...probe,
      behavior: "tag link focus",
      detail: "first tag navigation link is not keyboard focusable",
    });
  }

  if (!probe.focusRingVisible) {
    pushProbeFailure(issues, {
      ...probe,
      behavior: "tag link focus ring",
      detail: `tag link focus ring is not visible (expected outline or ring >= ${FOCUS_RING_MIN_PX}px)`,
    });
  }

  return issues;
}

/**
 * Returns accessibility issues when GQA graph switcher or docs chrome keyboard
 * navigation fails on a canonical module page.
 */
export function auditGqaKeyboardAccessibility(
  probe: GqaKeyboardAccessibilityProbe,
): RenderedQualityIssue[] {
  if (probe.errorDetail) {
    return [
      {
        route: probe.route.path,
        routeLabel: probe.route.label,
        viewport: probe.viewport,
        lane: "accessibility",
        behavior: "docs keyboard probe",
        detail: probe.errorDetail,
      },
    ];
  }

  const issues: RenderedQualityIssue[] = [];

  if (!probe.switcherActivated) {
    pushProbeFailure(issues, {
      ...probe,
      behavior: "graph switcher keyboard",
      detail: "MHA graph switcher tab did not activate via keyboard Enter",
    });
  }

  if (!probe.tocLinkFocusable) {
    pushProbeFailure(issues, {
      ...probe,
      behavior: "toc link focus",
      detail:
        "first TOC link is not keyboard focusable on grouped-query-attention",
    });
  }

  if (!probe.sidebarLinkFocusable) {
    pushProbeFailure(issues, {
      ...probe,
      behavior: "sidebar link focus",
      detail: "first sidebar navigation link is not keyboard focusable",
    });
  }

  return issues;
}

async function waitForSearchResults(
  page: Page,
  timeoutMs: number,
): Promise<void> {
  await page.locator(SEARCH_PAGE_RESULTS_SELECTOR).waitFor({
    state: "visible",
    timeout: timeoutMs,
  });
}

async function waitForSearchEmpty(
  page: Page,
  timeoutMs: number,
): Promise<void> {
  await page.locator(SEARCH_PAGE_EMPTY_SELECTOR).waitFor({
    state: "visible",
    timeout: timeoutMs,
  });
}

export async function collectSearchKeyboardAccessibilityIssues(
  page: Page,
  route: RenderedQualityAuditRoute,
  viewport: RenderedQualityViewportId,
  baseUrl: string,
  timeoutMs: number,
): Promise<RenderedQualityIssue[]> {
  try {
    await page.goto(`${baseUrl}${route.path}`, {
      timeout: timeoutMs,
      waitUntil: "domcontentloaded",
    });

    const input = page.locator(SEARCH_PAGE_INPUT_SELECTOR);
    await input.waitFor({ state: "visible", timeout: timeoutMs });
    await input.focus();
    const inputFocusable = await input.evaluate(
      (element) => element === document.activeElement,
    );

    await input.fill(DEFAULT_ACCESSIBILITY_QUERY);
    await waitForSearchResults(page, timeoutMs);

    const resultsFailure = evaluateSearchPageResultsAccessibility(
      await readSearchPageResultsAccessibilitySnapshot(page),
    );
    const resultsFocusable = resultsFailure === null;

    await input.fill(DEFAULT_EMPTY_STATE_QUERY);
    await waitForSearchEmpty(page, timeoutMs);
    const emptyFailure = evaluateSearchPageEmptyState(
      await readSearchPageEmptyStateSnapshot(page),
    );
    if (emptyFailure) {
      return auditSearchKeyboardAccessibility({
        route,
        viewport,
        inputFocusable,
        resultsFocusable,
        emptySuggestionFocusable: false,
        errorDetail: emptyFailure,
      });
    }

    const suggestion = page.getByRole("button", { name: "GQA" });
    await suggestion.focus();
    const emptySuggestionFocusable = await suggestion.evaluate(
      (element) => element === document.activeElement,
    );

    return auditSearchKeyboardAccessibility({
      route,
      viewport,
      inputFocusable,
      resultsFocusable,
      emptySuggestionFocusable,
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "search keyboard probe failed";
    return auditSearchKeyboardAccessibility({
      route,
      viewport,
      inputFocusable: false,
      resultsFocusable: false,
      emptySuggestionFocusable: false,
      errorDetail: detail,
    });
  }
}

export async function collectTagLinkKeyboardAccessibilityIssues(
  page: Page,
  route: RenderedQualityAuditRoute,
  viewport: RenderedQualityViewportId,
  baseUrl: string,
  timeoutMs: number,
  linkSelector: string,
): Promise<RenderedQualityIssue[]> {
  try {
    await page.goto(`${baseUrl}${route.path}`, {
      timeout: timeoutMs,
      waitUntil: "domcontentloaded",
    });

    const probe = await readFocusRingVisible(page, linkSelector);
    return auditLinkKeyboardAccessibility({
      route,
      viewport,
      linkFocusable: probe.focusable,
      focusRingVisible: probe.focusRingVisible,
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "tag keyboard probe failed";
    return auditLinkKeyboardAccessibility({
      route,
      viewport,
      linkFocusable: false,
      focusRingVisible: false,
      errorDetail: detail,
    });
  }
}

export async function collectGqaKeyboardAccessibilityIssues(
  page: Page,
  route: RenderedQualityAuditRoute,
  viewport: RenderedQualityViewportId,
  baseUrl: string,
  timeoutMs: number,
): Promise<RenderedQualityIssue[]> {
  try {
    await page.goto(`${baseUrl}${route.path}`, {
      timeout: timeoutMs,
      waitUntil: "domcontentloaded",
    });

    const mhaTab = page.locator('[data-attention-variant-option="mha"]');
    await mhaTab.waitFor({ state: "visible", timeout: timeoutMs });
    await mhaTab.scrollIntoViewIfNeeded();
    await mhaTab.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(250);

    const activeVariant = await page
      .locator('[data-attention-variant-comparison="true"]')
      .getAttribute("data-attention-variant-active");

    const tocProbe = await probeDocsTocLinkFocus(page, viewport);
    const sidebarProbe = await probeDocsSidebarLinkFocus(page, viewport);

    return auditGqaKeyboardAccessibility({
      route,
      viewport,
      switcherActivated: activeVariant === "mha",
      tocLinkFocusable: tocProbe.focusable,
      sidebarLinkFocusable: sidebarProbe.focusable,
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "docs keyboard probe failed";
    return auditGqaKeyboardAccessibility({
      route,
      viewport,
      switcherActivated: false,
      tocLinkFocusable: false,
      sidebarLinkFocusable: false,
      errorDetail: detail,
    });
  }
}
