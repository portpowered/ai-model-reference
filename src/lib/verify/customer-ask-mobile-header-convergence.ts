import {
  PRIMARY_NAV_DESKTOP_CLASS,
  PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS,
  PRIMARY_NAV_MOBILE_PANEL_CLASS,
} from "@/components/layout/primary-nav";
import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";
import {
  BATCH_012_HEADER_BAR_CHECKLIST_ROW,
  BATCH_012_MOBILE_HEADER_CHECKS,
  BATCH_012_MOBILE_HEADER_ROUTE,
} from "./batch-012-mobile-header-checks";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";

export const MOBILE_HEADER_CUSTOMER_ASK_REASONS = {
  missingHeader: "home header region not found",
  missingMobileMenuButton:
    "mobile header missing hamburger or disclosure menu control (md:hidden menu button with aria-controls)",
  inlineFullNavVisible:
    "mobile header still exposes inline full primary navigation without responsive disclosure",
  missingDesktopNavHideBreakpoint:
    "desktop primary navigation missing responsive hidden/md:flex breakpoint classes",
} as const;

const PRIMARY_NAV_OPEN_TAG_PATTERN =
  /<nav\b[^>]*\baria-label="Primary"[^>]*>/gi;

const PRIMARY_NAV_BLOCK_PATTERN =
  /<nav\b[^>]*\baria-label="Primary"[^>]*>([\s\S]*?)<\/nav>/gi;

const MOBILE_MENU_BUTTON_PATTERN = /<button\b[^>]*>/gi;

function extractHeaderHtml(html: string): string {
  const match = html.match(/<header\b[^>]*>[\s\S]*?<\/header>/i);
  return match?.[0] ?? "";
}

function hasMobileMenuDisclosure(headerHtml: string): boolean {
  MOBILE_MENU_BUTTON_PATTERN.lastIndex = 0;
  let buttonMatch: RegExpExecArray | null =
    MOBILE_MENU_BUTTON_PATTERN.exec(headerHtml);
  while (buttonMatch) {
    const tag = buttonMatch[0];
    if (
      tag.includes(PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS) &&
      /\baria-controls="/i.test(tag) &&
      /\baria-expanded=/i.test(tag)
    ) {
      return true;
    }
    buttonMatch = MOBILE_MENU_BUTTON_PATTERN.exec(headerHtml);
  }
  return false;
}

function hasResponsiveDesktopPrimaryNav(headerHtml: string): boolean {
  PRIMARY_NAV_OPEN_TAG_PATTERN.lastIndex = 0;
  let navMatch: RegExpExecArray | null =
    PRIMARY_NAV_OPEN_TAG_PATTERN.exec(headerHtml);
  while (navMatch) {
    const openTag = navMatch[0];
    if (
      /\bhidden\b/.test(openTag) &&
      /\bmd:flex\b/.test(openTag) &&
      openTag.includes(PRIMARY_NAV_DESKTOP_CLASS.split(" ")[0] ?? "hidden")
    ) {
      return true;
    }
    navMatch = PRIMARY_NAV_OPEN_TAG_PATTERN.exec(headerHtml);
  }
  return false;
}

function hasInlineFullPrimaryNav(headerHtml: string): boolean {
  PRIMARY_NAV_BLOCK_PATTERN.lastIndex = 0;
  let navMatch: RegExpExecArray | null =
    PRIMARY_NAV_BLOCK_PATTERN.exec(headerHtml);
  while (navMatch) {
    const fullNav = navMatch[0];
    const openTag = fullNav.match(/^<nav\b[^>]*>/i)?.[0] ?? "";
    const isResponsiveDesktopNav =
      /\bhidden\b/.test(openTag) && /\bmd:flex\b/.test(openTag);
    const isMobilePanel =
      fullNav.includes(PRIMARY_NAV_MOBILE_PANEL_CLASS) ||
      (/\bmd:hidden\b/.test(openTag) && !isResponsiveDesktopNav);
    if (!isResponsiveDesktopNav && !isMobilePanel) {
      const linkCount = (navMatch[1].match(/<a\b/gi) ?? []).length;
      if (linkCount >= 2) {
        return true;
      }
    }
    navMatch = PRIMARY_NAV_BLOCK_PATTERN.exec(headerHtml);
  }
  return false;
}

/**
 * Returns a failure reason when built home HTML still exposes pre-repair inline
 * full primary navigation instead of a responsive hamburger/disclosure header.
 */
export function assertMobileHamburgerMenuConvergence(
  html: string,
): string | null {
  const headerHtml = extractHeaderHtml(stripHtmlScripts(html));
  if (headerHtml.length === 0) {
    return MOBILE_HEADER_CUSTOMER_ASK_REASONS.missingHeader;
  }

  if (hasInlineFullPrimaryNav(headerHtml)) {
    return MOBILE_HEADER_CUSTOMER_ASK_REASONS.inlineFullNavVisible;
  }

  if (!hasMobileMenuDisclosure(headerHtml)) {
    return MOBILE_HEADER_CUSTOMER_ASK_REASONS.missingMobileMenuButton;
  }

  if (!hasResponsiveDesktopPrimaryNav(headerHtml)) {
    return MOBILE_HEADER_CUSTOMER_ASK_REASONS.missingDesktopNavHideBreakpoint;
  }

  return null;
}

/**
 * Builds the batch-012 mobile header hamburger customer-ask row from built `/` HTML.
 */
export function buildCustomerAskMobileHeaderRow(
  html: string,
): CustomerAskConvergenceRow {
  const check = BATCH_012_MOBILE_HEADER_CHECKS.mobileHamburgerMenu;
  const reason = assertMobileHamburgerMenuConvergence(html);

  return {
    checkId: check.checkId,
    title: check.title,
    status: reason ? "fail" : "pass",
    route: BATCH_012_MOBILE_HEADER_ROUTE,
    reason: reason ?? undefined,
    checklistRow: BATCH_012_HEADER_BAR_CHECKLIST_ROW,
  };
}
