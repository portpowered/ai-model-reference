import type { Browser } from "playwright";
import { httpGetText } from "./http-harness";
import { launchPlaywrightBrowser } from "./launch-playwright-browser";
import { assertSearchPageExportShell } from "./phase-1-search-export-shell-checks";
import {
  formatPhase1SearchPageCheckFailure,
  PHASE_1_SEARCH_PAGE_QUERIES,
  runPhase1SearchPageChecks,
} from "./phase-1-search-page-checks";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

export const DEFAULT_STATIC_EXPORT_PHASE_1_QUERIES_TIMEOUT_MS = 45_000;

async function defaultLaunchBrowser(): Promise<Browser> {
  return launchPlaywrightBrowser();
}

export type VerifyStaticExportSearchPhase1QueriesOptions = {
  timeoutMs?: number;
  launchBrowser?: () => Promise<Browser>;
  queries?: readonly string[];
};

/**
 * Verifies Phase 1 canonical queries on exported `/search` when served from a
 * static export HTTP server (including GitHub Pages base paths).
 */
export async function verifyStaticExportSearchPhase1Queries(
  baseUrl: string,
  options: VerifyStaticExportSearchPhase1QueriesOptions = {},
): Promise<string | null> {
  const timeoutMs =
    options.timeoutMs ?? DEFAULT_STATIC_EXPORT_PHASE_1_QUERIES_TIMEOUT_MS;
  const launchBrowser = options.launchBrowser ?? defaultLaunchBrowser;
  const searchUrl = `${normalizeVerifyBaseUrl(baseUrl)}/search`;

  const htmlResponse = await httpGetText(searchUrl, timeoutMs);
  if (htmlResponse.status < 200 || htmlResponse.status >= 300) {
    return `/search export route returned HTTP ${htmlResponse.status}.`;
  }

  const shellFailure = assertSearchPageExportShell(htmlResponse.body);
  if (shellFailure) {
    return shellFailure;
  }

  try {
    const failures = await runPhase1SearchPageChecks(baseUrl, {
      timeoutMs,
      launchBrowser,
      queries: options.queries ?? PHASE_1_SEARCH_PAGE_QUERIES,
    });

    const firstFailure = failures[0];
    if (!firstFailure) {
      return null;
    }

    return formatPhase1SearchPageCheckFailure(firstFailure);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}
