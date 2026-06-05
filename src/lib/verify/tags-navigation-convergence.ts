import {
  GROUPED_QUERY_ATTENTION_URL,
  PLACEHOLDER_SIDEBAR_DESCRIPTION,
  stripHtmlScripts,
  TOKEN_GLOSSARY_URL,
} from "@/lib/navigation/docs-sidebar-contract";

export const ATTENTION_TAG_LANDING_PATH = "/tags/attention" as const;
export const ATTENTION_TAG_SCOPED_SEARCH_URL = "/search?tag=attention" as const;

/** Stable failure reasons for Phase 1 tags index and tag landing navigation checks. */
export const TAGS_NAVIGATION_CONVERGENCE_REASONS = {
  missingPrimaryNav: 'missing primary navigation (aria-label="Primary")',
  missingTagsTitle: 'missing tags index title marker ("Tags")',
  missingAttentionTagLink: `missing attention tag landing link (${ATTENTION_TAG_LANDING_PATH})`,
  missingAttentionTitle: 'missing attention tag title marker ("Attention")',
  missingSampleModuleLink: `missing sample module link (${GROUPED_QUERY_ATTENTION_URL})`,
  missingTokenGlossaryLink: `missing token glossary link (${TOKEN_GLOSSARY_URL})`,
  missingTagScopedSearchLink: `missing tag-scoped search link (${ATTENTION_TAG_SCOPED_SEARCH_URL})`,
  placeholderCopy: `placeholder scaffold copy detected (${PLACEHOLDER_SIDEBAR_DESCRIPTION})`,
  loremPlaceholder: "placeholder lorem copy detected",
} as const;

export type TagsNavigationConvergenceReason =
  (typeof TAGS_NAVIGATION_CONVERGENCE_REASONS)[keyof typeof TAGS_NAVIGATION_CONVERGENCE_REASONS];

function assertPrimarySiteNavigation(html: string): string | null {
  if (!html.includes('aria-label="Primary"')) {
    return TAGS_NAVIGATION_CONVERGENCE_REASONS.missingPrimaryNav;
  }
  return null;
}

function assertNoPlaceholderCopy(html: string): string | null {
  if (html.includes(PLACEHOLDER_SIDEBAR_DESCRIPTION)) {
    return TAGS_NAVIGATION_CONVERGENCE_REASONS.placeholderCopy;
  }

  if (html.toLowerCase().includes("lorem")) {
    return TAGS_NAVIGATION_CONVERGENCE_REASONS.loremPlaceholder;
  }

  return null;
}

/**
 * Returns the first tags index navigation failure reason, or null when HTML exposes
 * coherent primary site navigation, real tag navigation, and no placeholder copy.
 * Tags routes are not required to expose Fumadocs nd-sidebar regions.
 */
export function assertTagsIndexNavigationConvergence(
  html: string,
): string | null {
  const visibleHtml = stripHtmlScripts(html);

  const primaryNavReason = assertPrimarySiteNavigation(visibleHtml);
  if (primaryNavReason) {
    return primaryNavReason;
  }

  if (!visibleHtml.includes("Tags")) {
    return TAGS_NAVIGATION_CONVERGENCE_REASONS.missingTagsTitle;
  }

  if (!visibleHtml.includes(ATTENTION_TAG_LANDING_PATH)) {
    return TAGS_NAVIGATION_CONVERGENCE_REASONS.missingAttentionTagLink;
  }

  return assertNoPlaceholderCopy(visibleHtml);
}

/**
 * Returns the first attention tag landing navigation failure reason, or null when HTML
 * exposes primary navigation plus links to the sample module, token glossary, and
 * tag-scoped search without placeholder copy.
 */
export function assertTagsAttentionNavigationConvergence(
  html: string,
): string | null {
  const visibleHtml = stripHtmlScripts(html);

  const primaryNavReason = assertPrimarySiteNavigation(visibleHtml);
  if (primaryNavReason) {
    return primaryNavReason;
  }

  if (!visibleHtml.includes("Attention")) {
    return TAGS_NAVIGATION_CONVERGENCE_REASONS.missingAttentionTitle;
  }

  if (!visibleHtml.includes(GROUPED_QUERY_ATTENTION_URL)) {
    return TAGS_NAVIGATION_CONVERGENCE_REASONS.missingSampleModuleLink;
  }

  if (!visibleHtml.includes(TOKEN_GLOSSARY_URL)) {
    return TAGS_NAVIGATION_CONVERGENCE_REASONS.missingTokenGlossaryLink;
  }

  if (!visibleHtml.includes(ATTENTION_TAG_SCOPED_SEARCH_URL)) {
    return TAGS_NAVIGATION_CONVERGENCE_REASONS.missingTagScopedSearchLink;
  }

  return assertNoPlaceholderCopy(visibleHtml);
}
