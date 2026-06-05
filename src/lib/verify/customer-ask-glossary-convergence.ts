import { assertFooterChromeContract } from "@/lib/navigation/docs-page-footer-contract";
import {
  stripHtmlScripts,
  TOKEN_GLOSSARY_URL,
} from "@/lib/navigation/docs-sidebar-contract";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";

/** Checklist row for batch-008 glossary page customer-ask inventory. */
export const GLOSSARY_CUSTOMER_ASK_CHECKLIST_ROW =
  "phase-1-glossary-page" as const;

export const GLOSSARY_CUSTOMER_ASK_ROUTE = TOKEN_GLOSSARY_URL;

export const GLOSSARY_TOKEN_REGISTRY_ID = "concept.token" as const;

export const GLOSSARY_TOKEN_TITLE = "Token" as const;

export const GLOSSARY_CUSTOMER_ASK_CHECKS = {
  presentation: {
    checkId: "glossary.presentation",
    title: "Glossary token page has one title and concise opening",
  },
  chromeLinks: {
    checkId: "glossary.chrome-links",
    title: "Glossary tag and related-doc chrome links omit underline",
  },
  footerHover: {
    checkId: "glossary.footer-hover",
    title: "Glossary footer previous/next label and sublabel hover styles pair",
  },
} as const;

export const GLOSSARY_CUSTOMER_ASK_REASONS = {
  duplicatePrimaryTitle:
    "duplicate primary title in glossary shell or article body",
  duplicateTagSurfaces: "duplicate tag pill list surfaces",
  whereItAppears: "Where It Appears section still present",
  problemCoreBlocks:
    "separate problem-statement and core-idea blocks still present",
  missingOpening: "glossary opening summary missing",
  chromeUnderline:
    "glossary tag or related-doc chrome links use underline outside prose",
  missingTagPillList: "tag pill list marker missing from glossary page",
  missingRelatedDocs: "curated related docs marker missing from glossary page",
} as const;

const H1_PATTERN = /<h1\b[^>]*>[\s\S]*?<\/h1>/gi;

const PROBLEM_CORE_MARKERS = [
  'id="problem-statement"',
  'id="core-idea"',
  '<T k="problemStatement"',
  '<T k="coreIdea"',
  "Problem Statement",
  "Core Idea",
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countH1BlocksContaining(html: string, text: string): number {
  const blocks = html.match(H1_PATTERN) ?? [];
  return blocks.filter((block) => block.includes(text)).length;
}

/**
 * Extracts the token glossary article region from built route HTML.
 */
export function extractGlossaryTokenArticleHtml(html: string): string {
  const visibleHtml = stripHtmlScripts(html);
  const match = visibleHtml.match(
    new RegExp(
      `<article[^>]*data-registry-id="${escapeRegExp(GLOSSARY_TOKEN_REGISTRY_ID)}"[^>]*>[\\s\\S]*?</article>`,
      "i",
    ),
  );
  return match?.[0] ?? "";
}

function assertDuplicatePrimaryTitle(html: string): string | null {
  if (countH1BlocksContaining(html, GLOSSARY_TOKEN_TITLE) > 1) {
    return GLOSSARY_CUSTOMER_ASK_REASONS.duplicatePrimaryTitle;
  }

  const articleHtml = extractGlossaryTokenArticleHtml(html);
  if (
    articleHtml.length > 0 &&
    new RegExp(
      `<h1\\b[^>]*>\\s*${escapeRegExp(GLOSSARY_TOKEN_TITLE)}\\s*</h1>`,
      "i",
    ).test(articleHtml)
  ) {
    return GLOSSARY_CUSTOMER_ASK_REASONS.duplicatePrimaryTitle;
  }

  return null;
}

function assertDuplicateTagSurfaces(html: string): string | null {
  const visibleHtml = stripHtmlScripts(html);
  const tagPillCount = (visibleHtml.match(/data-testid="tag-pill-list"/g) ?? [])
    .length;

  if (tagPillCount === 0) {
    return GLOSSARY_CUSTOMER_ASK_REASONS.missingTagPillList;
  }

  if (tagPillCount > 1) {
    return GLOSSARY_CUSTOMER_ASK_REASONS.duplicateTagSurfaces;
  }

  return null;
}

function assertWhereItAppearsAbsent(html: string): string | null {
  const visibleHtml = stripHtmlScripts(html);

  if (visibleHtml.includes('id="where-it-appears"')) {
    return GLOSSARY_CUSTOMER_ASK_REASONS.whereItAppears;
  }

  if (visibleHtml.includes("Where It Appears")) {
    return GLOSSARY_CUSTOMER_ASK_REASONS.whereItAppears;
  }

  if (visibleHtml.includes('data-testid="derived-related-docs"')) {
    return GLOSSARY_CUSTOMER_ASK_REASONS.whereItAppears;
  }

  return null;
}

function assertProblemCoreBlocksAbsent(html: string): string | null {
  const visibleHtml = stripHtmlScripts(html);
  const hasProblemCoreMarker = PROBLEM_CORE_MARKERS.some((marker) =>
    visibleHtml.includes(marker),
  );

  if (hasProblemCoreMarker) {
    return GLOSSARY_CUSTOMER_ASK_REASONS.problemCoreBlocks;
  }

  return null;
}

function assertGlossaryOpeningPresent(html: string): string | null {
  const visibleHtml = stripHtmlScripts(html);
  const openingCount = (
    visibleHtml.match(/data-testid="glossary-opening"/g) ?? []
  ).length;

  if (openingCount !== 1) {
    return GLOSSARY_CUSTOMER_ASK_REASONS.missingOpening;
  }

  return null;
}

/**
 * Returns a failure reason when built glossary token HTML still shows pre-repair
 * duplicate titles, tag surfaces, where-it-appears, or problem/core blocks.
 */
export function assertGlossaryPresentationConvergence(
  html: string,
): string | null {
  const checks = [
    assertDuplicatePrimaryTitle,
    assertDuplicateTagSurfaces,
    assertWhereItAppearsAbsent,
    assertProblemCoreBlocksAbsent,
    assertGlossaryOpeningPresent,
  ] as const;

  for (const check of checks) {
    const reason = check(html);
    if (reason) {
      return reason;
    }
  }

  return null;
}

function extractElementHtml(html: string, marker: string): string | null {
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) {
    return null;
  }

  let openUl = html.lastIndexOf("<ul", markerIndex);
  if (openUl < 0) {
    openUl = html.indexOf("<ul", markerIndex);
  }
  if (openUl < 0) {
    return null;
  }

  const closeUl = html.indexOf("</ul>", openUl);
  if (closeUl < 0) {
    return null;
  }

  return html.slice(openUl, closeUl + "</ul>".length);
}

/**
 * Returns a failure reason when glossary tag or related-doc chrome links use
 * underline utilities outside prose regions.
 */
export function assertGlossaryChromeLinksConvergence(
  html: string,
): string | null {
  const visibleHtml = stripHtmlScripts(html);

  if (!visibleHtml.includes('data-testid="curated-related-docs"')) {
    return GLOSSARY_CUSTOMER_ASK_REASONS.missingRelatedDocs;
  }

  const fragments = [
    extractElementHtml(visibleHtml, 'data-testid="tag-pill-list"'),
    extractElementHtml(visibleHtml, 'data-testid="curated-related-docs"'),
  ];

  for (const fragment of fragments) {
    if (!fragment) {
      return GLOSSARY_CUSTOMER_ASK_REASONS.chromeUnderline;
    }

    if (!fragment.includes("no-underline")) {
      return GLOSSARY_CUSTOMER_ASK_REASONS.chromeUnderline;
    }

    const withoutNoUnderline = fragment.replaceAll("no-underline", "");
    if (/\bunderline\b/.test(withoutNoUnderline)) {
      return GLOSSARY_CUSTOMER_ASK_REASONS.chromeUnderline;
    }
  }

  return null;
}

function hasFooterNavigation(html: string): boolean {
  return (
    html.includes('id="nd-page"') &&
    (html.includes("Previous Page") || html.includes("Next Page"))
  );
}

/**
 * Footer hover passes when built HTML footer cards match the shared footer
 * chrome contract; fails with a concrete reason when navigation exists but
 * contract markers are missing; uncertain only when footer nav is absent.
 */
export function evaluateGlossaryFooterHoverRow(
  html: string,
): CustomerAskConvergenceRow {
  const visibleHtml = stripHtmlScripts(html);

  if (!hasFooterNavigation(visibleHtml)) {
    return {
      checkId: GLOSSARY_CUSTOMER_ASK_CHECKS.footerHover.checkId,
      title: GLOSSARY_CUSTOMER_ASK_CHECKS.footerHover.title,
      status: "uncertain",
      route: GLOSSARY_CUSTOMER_ASK_ROUTE,
      reason: "footer previous/next navigation not found in built HTML",
      checklistRow: GLOSSARY_CUSTOMER_ASK_CHECKLIST_ROW,
    };
  }

  const failureReason = assertFooterChromeContract(visibleHtml);

  if (failureReason) {
    return {
      checkId: GLOSSARY_CUSTOMER_ASK_CHECKS.footerHover.checkId,
      title: GLOSSARY_CUSTOMER_ASK_CHECKS.footerHover.title,
      status: "fail",
      route: GLOSSARY_CUSTOMER_ASK_ROUTE,
      reason: failureReason,
      checklistRow: GLOSSARY_CUSTOMER_ASK_CHECKLIST_ROW,
    };
  }

  return {
    checkId: GLOSSARY_CUSTOMER_ASK_CHECKS.footerHover.checkId,
    title: GLOSSARY_CUSTOMER_ASK_CHECKS.footerHover.title,
    status: "pass",
    route: GLOSSARY_CUSTOMER_ASK_ROUTE,
    checklistRow: GLOSSARY_CUSTOMER_ASK_CHECKLIST_ROW,
  };
}

function toPassFailRow(
  check: (typeof GLOSSARY_CUSTOMER_ASK_CHECKS)[keyof typeof GLOSSARY_CUSTOMER_ASK_CHECKS],
  reason: string | null,
): CustomerAskConvergenceRow {
  return {
    checkId: check.checkId,
    title: check.title,
    status: reason ? "fail" : "pass",
    route: GLOSSARY_CUSTOMER_ASK_ROUTE,
    reason: reason ?? undefined,
    checklistRow: GLOSSARY_CUSTOMER_ASK_CHECKLIST_ROW,
  };
}

/**
 * Builds customer-ask convergence rows for glossary token page polish from built HTML.
 */
export function buildCustomerAskGlossaryRows(
  html: string,
): CustomerAskConvergenceRow[] {
  return [
    toPassFailRow(
      GLOSSARY_CUSTOMER_ASK_CHECKS.presentation,
      assertGlossaryPresentationConvergence(html),
    ),
    toPassFailRow(
      GLOSSARY_CUSTOMER_ASK_CHECKS.chromeLinks,
      assertGlossaryChromeLinksConvergence(html),
    ),
    evaluateGlossaryFooterHoverRow(html),
  ];
}
