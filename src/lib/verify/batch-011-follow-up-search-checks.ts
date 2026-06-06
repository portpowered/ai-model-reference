import { PHASE_1_SEARCH_PAGE_QUERIES } from "./phase-1-search-page-checks";

/** Checklist row for batch-011 search row hover and selection follow-up checks. */
export const BATCH_011_FOLLOW_UP_SEARCH_CHECKLIST_ROW =
  "phase-1-search-surface" as const;

export const BATCH_011_FOLLOW_UP_SEARCH_ROUTES = {
  searchPage: "/search",
  searchApi: "/api/search",
  headerDialog: "header-dialog",
} as const;

export const BATCH_011_FOLLOW_UP_SEARCH_QUERIES = PHASE_1_SEARCH_PAGE_QUERIES;

export const BATCH_011_FOLLOW_UP_SEARCH_CHECKS = {
  pageRowHoverCoherence: {
    checkId: "search.page.row-hover-coherence",
    title:
      "Search page first result row applies hover styling across meta details",
  },
  pageMatchedTextSelectionContrast: {
    checkId: "search.page.matched-text-selection-contrast",
    title:
      "Search page matched query text stays readable on selected pink background",
  },
  dialogRowHoverCoherence: {
    checkId: "search.dialog.row-hover-coherence",
    title:
      "Header search dialog first result row applies hover styling across meta details",
  },
  dialogMatchedTextSelectionContrast: {
    checkId: "search.dialog.matched-text-selection-contrast",
    title:
      "Header search dialog matched query text stays readable on selected pink background",
  },
} as const;
