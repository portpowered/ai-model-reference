import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";
import {
  assertSearchPageExportShell,
  SEARCH_PAGE_INPUT_HTML_MARKER,
} from "./phase-1-search-export-shell-checks";

/** Phase 1 manual-gate canonical note marker on `/search`. */
export const SEARCH_PAGE_CANONICAL_NOTE_MARKER = "Canonical search entry URL";

function countOccurrences(html: string, needle: string): number {
  let count = 0;
  let index = html.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = html.indexOf(needle, index + needle.length);
  }
  return count;
}

function countH1BlocksContaining(html: string, text: string): number {
  const h1Pattern = /<h1\b[^>]*>[\s\S]*?<\/h1>/gi;
  const blocks = html.match(h1Pattern) ?? [];
  return blocks.filter((block) => block.includes(text)).length;
}

/**
 * Returns the first built-app `/search` shell failure reason, or null when the
 * page exposes exactly one title, one inline search input, and one canonical note.
 */
export function assertSearchPageBuiltAppShell(html: string): string | null {
  const exportFailure = assertSearchPageExportShell(html);
  if (exportFailure) {
    return exportFailure;
  }

  const visibleHtml = stripHtmlScripts(html);

  const inputCount = countOccurrences(
    visibleHtml,
    SEARCH_PAGE_INPUT_HTML_MARKER,
  );
  if (inputCount !== 1) {
    return `expected exactly one search-page-input, found ${inputCount}`;
  }

  const titleCount = countH1BlocksContaining(visibleHtml, "Search");
  if (titleCount !== 1) {
    return `expected exactly one Search h1, found ${titleCount}`;
  }

  const canonicalCount = countOccurrences(
    visibleHtml,
    SEARCH_PAGE_CANONICAL_NOTE_MARKER,
  );
  if (canonicalCount !== 1) {
    return `expected exactly one canonical note block, found ${canonicalCount}`;
  }

  return null;
}
