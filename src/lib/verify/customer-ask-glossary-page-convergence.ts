import { glossaryPageHref } from "@/lib/content/content-hrefs";
import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";
import {
  BATCH_012_GLOSSARY_CHECKLIST_ROW,
  BATCH_012_GLOSSARY_CHECKS,
  type BATCH_012_GLOSSARY_OPENING_SUMMARY_ROUTES,
  BATCH_012_GLOSSARY_ROUTES,
} from "./batch-012-glossary-checks";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  extractGlossaryShellHtml,
  GLOSSARY_EMBEDDING_REGISTRY_ID,
  GLOSSARY_HIDDEN_SIZE_REGISTRY_ID,
  GLOSSARY_TOKEN_REGISTRY_ID,
  GLOSSARY_VECTOR_REGISTRY_ID,
} from "./customer-ask-glossary-convergence";

export const GLOSSARY_PAGE_TOKEN_REGISTRY_ID = GLOSSARY_TOKEN_REGISTRY_ID;
export const GLOSSARY_PAGE_EMBEDDING_REGISTRY_ID =
  GLOSSARY_EMBEDDING_REGISTRY_ID;

export const GLOSSARY_OPENING_SUMMARY_REGISTRY_BY_ROUTE = {
  [BATCH_012_GLOSSARY_ROUTES.token]: GLOSSARY_TOKEN_REGISTRY_ID,
  [BATCH_012_GLOSSARY_ROUTES.embedding]: GLOSSARY_EMBEDDING_REGISTRY_ID,
  [BATCH_012_GLOSSARY_ROUTES.vector]: GLOSSARY_VECTOR_REGISTRY_ID,
  [BATCH_012_GLOSSARY_ROUTES.hiddenSize]: GLOSSARY_HIDDEN_SIZE_REGISTRY_ID,
} as const;

export type GlossaryOpeningSummaryRoute =
  (typeof BATCH_012_GLOSSARY_OPENING_SUMMARY_ROUTES)[number];

export const GLOSSARY_PAGE_EMBEDDING_VECTOR_HREF = glossaryPageHref("vector");
export const GLOSSARY_PAGE_EMBEDDING_TOKEN_HREF = glossaryPageHref("token");

export const GLOSSARY_PAGE_CUSTOMER_ASK_REASONS = {
  renderedGlossaryOpening:
    "rendered glossary opening summary block still present (GlossaryOpening output)",
  renderedOpeningSummaryInArticle:
    "distinct openingSummary block still rendered inside glossary article separate from shell description",
  missingShellDescription:
    "glossary shell description region not found before article body",
  missingEmbeddingVectorLink:
    "embedding glossary shell description missing resolved link to vector target",
  missingEmbeddingTokenLink:
    "embedding glossary shell description missing resolved link to token target",
} as const;

const OPENING_SUMMARY_MARKERS = [
  'data-testid="glossary-opening"',
  'id="opening-summary"',
  'id="glossary-opening"',
  '<T k="openingSummary"',
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractGlossaryArticleHtml(html: string, registryId: string): string {
  const visibleHtml = stripHtmlScripts(html);
  const match = visibleHtml.match(
    new RegExp(
      `<article[^>]*data-registry-id="${escapeRegExp(registryId)}"[^>]*>[\\s\\S]*?</article>`,
      "i",
    ),
  );
  return match?.[0] ?? "";
}

function articleHasDistinctOpeningSummaryBlock(articleHtml: string): boolean {
  for (const marker of OPENING_SUMMARY_MARKERS) {
    if (articleHtml.includes(marker)) {
      return true;
    }
  }

  return /<section\b[^>]*\bdata-message-key="openingSummary"[^>]*>/i.test(
    articleHtml,
  );
}

/**
 * Returns a failure reason when built glossary HTML still renders a distinct
 * openingSummary block or GlossaryOpening output outside the shell description.
 */
export function assertGlossaryNoRenderedOpeningSummaryForRegistry(
  html: string,
  articleRegistryId: string,
): string | null {
  const visibleHtml = stripHtmlScripts(html);

  for (const marker of OPENING_SUMMARY_MARKERS) {
    if (visibleHtml.includes(marker)) {
      return marker === 'data-testid="glossary-opening"'
        ? GLOSSARY_PAGE_CUSTOMER_ASK_REASONS.renderedGlossaryOpening
        : GLOSSARY_PAGE_CUSTOMER_ASK_REASONS.renderedOpeningSummaryInArticle;
    }
  }

  const articleHtml = extractGlossaryArticleHtml(
    visibleHtml,
    articleRegistryId,
  );
  if (
    articleHtml.length > 0 &&
    articleHasDistinctOpeningSummaryBlock(articleHtml)
  ) {
    return GLOSSARY_PAGE_CUSTOMER_ASK_REASONS.renderedOpeningSummaryInArticle;
  }

  return null;
}

/**
 * Returns a failure reason when built token glossary HTML still renders a
 * distinct openingSummary block or GlossaryOpening output outside the shell
 * description.
 */
export function assertGlossaryNoRenderedOpeningSummary(
  html: string,
): string | null {
  return assertGlossaryNoRenderedOpeningSummaryForRegistry(
    html,
    GLOSSARY_PAGE_TOKEN_REGISTRY_ID,
  );
}

function shellDescriptionHasAutoLinkedHref(
  shellDescriptionHtml: string,
  href: string,
): boolean {
  const linkPattern = new RegExp(
    `<a\\b[^>]*\\bhref="${escapeRegExp(href)}"[^>]*\\bdata-prose-auto-link="true"[^>]*>`,
    "i",
  );
  return linkPattern.test(shellDescriptionHtml);
}

/**
 * Returns a failure reason when built embedding glossary HTML omits resolved
 * vector and token links in the shell description region.
 */
export function assertEmbeddingDescriptionLinks(html: string): string | null {
  const shellDescriptionHtml = extractGlossaryShellHtml(
    html,
    GLOSSARY_PAGE_EMBEDDING_REGISTRY_ID,
  );
  if (shellDescriptionHtml.trim().length === 0) {
    return GLOSSARY_PAGE_CUSTOMER_ASK_REASONS.missingShellDescription;
  }

  if (
    !shellDescriptionHasAutoLinkedHref(
      shellDescriptionHtml,
      GLOSSARY_PAGE_EMBEDDING_VECTOR_HREF,
    )
  ) {
    return GLOSSARY_PAGE_CUSTOMER_ASK_REASONS.missingEmbeddingVectorLink;
  }

  if (
    !shellDescriptionHasAutoLinkedHref(
      shellDescriptionHtml,
      GLOSSARY_PAGE_EMBEDDING_TOKEN_HREF,
    )
  ) {
    return GLOSSARY_PAGE_CUSTOMER_ASK_REASONS.missingEmbeddingTokenLink;
  }

  return null;
}

function toPassFailRow(
  check: (typeof BATCH_012_GLOSSARY_CHECKS)[keyof typeof BATCH_012_GLOSSARY_CHECKS],
  route: string,
  reason: string | null,
): CustomerAskConvergenceRow {
  return {
    checkId: check.checkId,
    title: check.title,
    status: reason ? "fail" : "pass",
    route,
    reason: reason ?? undefined,
    checklistRow: BATCH_012_GLOSSARY_CHECKLIST_ROW,
  };
}

/**
 * Builds a batch-012 glossary opening-summary customer-ask row for a route.
 */
export function buildCustomerAskGlossaryNoOpeningSummaryRowForRoute(
  html: string,
  route: GlossaryOpeningSummaryRoute,
): CustomerAskConvergenceRow {
  return toPassFailRow(
    BATCH_012_GLOSSARY_CHECKS.noRenderedOpeningSummary,
    route,
    assertGlossaryNoRenderedOpeningSummaryForRegistry(
      html,
      GLOSSARY_OPENING_SUMMARY_REGISTRY_BY_ROUTE[route],
    ),
  );
}

/**
 * Builds the batch-012 glossary opening-summary customer-ask row from built token HTML.
 */
export function buildCustomerAskGlossaryNoOpeningSummaryRow(
  html: string,
): CustomerAskConvergenceRow {
  return buildCustomerAskGlossaryNoOpeningSummaryRowForRoute(
    html,
    BATCH_012_GLOSSARY_ROUTES.token,
  );
}

/**
 * Builds the batch-012 embedding description-link customer-ask row from built HTML.
 */
export function buildCustomerAskEmbeddingDescriptionLinksRow(
  html: string,
): CustomerAskConvergenceRow {
  return toPassFailRow(
    BATCH_012_GLOSSARY_CHECKS.embeddingDescriptionLinks,
    BATCH_012_GLOSSARY_ROUTES.embedding,
    assertEmbeddingDescriptionLinks(html),
  );
}
