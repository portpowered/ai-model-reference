import { PHASE_1_SEARCH_PAGE_QUERIES } from "./phase-1-search-page-checks";

/** Checklist row for batch-012 tags page resource-link customer-ask inventory. */
export const BATCH_012_TAGS_PAGE_CHECKLIST_ROW = "phase-1-tags-page" as const;

/** Checklist row for batch-012 search inline-result decoration customer-ask inventory. */
export const BATCH_012_SEARCH_PAGE_CHECKLIST_ROW =
  "phase-1-search-surface" as const;

export const BATCH_012_TAG_SEARCH_DECORATION_ROUTES = {
  tagsIndex: "/tags",
  attentionLanding: "/tags/attention",
  searchPage: "/search",
} as const;

export const BATCH_012_TAG_SEARCH_DECORATION_SEARCH_QUERIES =
  PHASE_1_SEARCH_PAGE_QUERIES;

export const BATCH_012_TAG_SEARCH_DECORATION_CHECKS = {
  resourceLinkNoBlanketUnderline: {
    checkId: "tags.resource-link-no-blanket-underline",
    title:
      "Tag resource list links omit blanket underline on nested label and meta elements",
  },
  inlineResultNoListDecoration: {
    checkId: "search.inline-result-no-list-decoration",
    title:
      "Search inline result items omit list-marker decoration outside prose",
  },
} as const;
