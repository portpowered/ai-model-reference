import { GQA_MODULE_CUSTOMER_ASK_ROUTE } from "./customer-ask-gqa-module-convergence";
import { HOME_HEADER_CUSTOMER_ASK_CHECKLIST_ROW } from "./customer-ask-home-header-convergence";

/** Checklist row for batch-011 home brevity and nav theme follow-up checks. */
export const BATCH_011_FOLLOW_UP_HOME_NAV_CHECKLIST_ROW =
  HOME_HEADER_CUSTOMER_ASK_CHECKLIST_ROW;

export const BATCH_011_FOLLOW_UP_HOME_ROUTE = "/" as const;

/** Docs-shell route used to observe left-nav theme toggle state. */
export const BATCH_011_FOLLOW_UP_NAV_ROUTE = GQA_MODULE_CUSTOMER_ASK_ROUTE;

export const BATCH_011_FOLLOW_UP_HOME_NAV_CHECKS = {
  homeBrevity: {
    checkId: "home.brevity",
    title:
      "Home brush header omits excess bottom margin and verbose inline search copy",
  },
  homeBrowseLinks: {
    checkId: "home.browse-links",
    title:
      "Home browse links omit disc bullets and persistent underlines outside prose",
  },
  navNoBrokenThemeToggle: {
    checkId: "nav.no-broken-theme-toggle",
    title: "Docs left navigation omits non-working theme toggle control",
  },
} as const;
