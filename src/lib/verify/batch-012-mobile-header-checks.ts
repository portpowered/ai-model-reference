/** Checklist row for batch-012 responsive header bar customer-ask inventory. */
export const BATCH_012_HEADER_BAR_CHECKLIST_ROW = "phase-1-header-bar" as const;

export const BATCH_012_MOBILE_HEADER_ROUTE = "/" as const;

export const BATCH_012_MOBILE_HEADER_CHECKS = {
  mobileHamburgerMenu: {
    checkId: "home.mobile-hamburger-menu",
    title:
      "Mobile header exposes hamburger or disclosure menu instead of inline full nav",
  },
} as const;
