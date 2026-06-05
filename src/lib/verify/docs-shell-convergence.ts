import {
  collectSidebarPageLinks,
  extractNdSidebarHtml,
  hasLegacyPlaceholderSidebar,
  PLACEHOLDER_SIDEBAR_DESCRIPTION,
  stripHtmlScripts,
  TOKEN_GLOSSARY_URL,
} from "@/lib/navigation/docs-sidebar-contract";
import { source } from "@/lib/source";

/** Stable failure reasons for unified docs shell convergence checks. */
export const DOCS_SHELL_CONVERGENCE_REASONS = {
  missingPrimaryNav: 'missing primary navigation (aria-label="Primary")',
  missingNdSidebar: 'missing Fumadocs sidebar (id="nd-sidebar")',
  missingNdPage: 'missing Fumadocs page region (id="nd-page")',
  emptySidebar: "Fumadocs sidebar region is empty or not extractable",
  missingModulesLabel: "sidebar missing Modules navigation label",
  missingGlossaryLabel: "sidebar missing Glossary navigation label",
  missingTokenGlossaryLink: `missing token glossary link (${TOKEN_GLOSSARY_URL})`,
  legacyPlaceholderSidebar: `legacy placeholder sidebar copy detected (${PLACEHOLDER_SIDEBAR_DESCRIPTION})`,
} as const;

export type DocsShellConvergenceReason =
  (typeof DOCS_SHELL_CONVERGENCE_REASONS)[keyof typeof DOCS_SHELL_CONVERGENCE_REASONS];

/**
 * Returns the first shell convergence failure reason, or null when HTML satisfies
 * the unified Fumadocs docs shell contract (primary nav, nd-sidebar/page, populated
 * Modules/Glossary sidebar, token glossary link, no legacy placeholder sidebar).
 */
export function assertDocsShellConvergence(html: string): string | null {
  const visibleHtml = stripHtmlScripts(html);

  if (!visibleHtml.includes('aria-label="Primary"')) {
    return DOCS_SHELL_CONVERGENCE_REASONS.missingPrimaryNav;
  }

  if (!visibleHtml.includes('id="nd-sidebar"')) {
    return DOCS_SHELL_CONVERGENCE_REASONS.missingNdSidebar;
  }

  if (!visibleHtml.includes('id="nd-page"')) {
    return DOCS_SHELL_CONVERGENCE_REASONS.missingNdPage;
  }

  const sidebar = extractNdSidebarHtml(visibleHtml);
  if (sidebar.length === 0) {
    return DOCS_SHELL_CONVERGENCE_REASONS.emptySidebar;
  }

  if (!sidebar.includes(">Modules<")) {
    return DOCS_SHELL_CONVERGENCE_REASONS.missingModulesLabel;
  }

  if (!sidebar.includes(">Glossary<")) {
    return DOCS_SHELL_CONVERGENCE_REASONS.missingGlossaryLabel;
  }

  const pageTreeLinks = collectSidebarPageLinks(source.pageTree);
  if (!pageTreeLinks.some((link) => link.url === TOKEN_GLOSSARY_URL)) {
    return DOCS_SHELL_CONVERGENCE_REASONS.missingTokenGlossaryLink;
  }

  if (
    visibleHtml.includes(PLACEHOLDER_SIDEBAR_DESCRIPTION) ||
    hasLegacyPlaceholderSidebar(visibleHtml)
  ) {
    return DOCS_SHELL_CONVERGENCE_REASONS.legacyPlaceholderSidebar;
  }

  return null;
}
