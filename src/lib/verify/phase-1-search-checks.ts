import { glossaryPageHref, modulePageHref } from "@/lib/content/content-hrefs";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  FetchTimeoutError,
  httpGetText,
} from "./http-harness";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

export const PHASE_1_GROUPED_QUERY_ATTENTION_URL = modulePageHref(
  "grouped-query-attention",
);
export const PHASE_1_ATTENTION_MODULE_URL = modulePageHref("attention");
export const PHASE_1_VECTOR_GLOSSARY_URL = glossaryPageHref("vector");
export const PHASE_1_HIDDEN_SIZE_GLOSSARY_URL = glossaryPageHref("hidden-size");

export type SearchResultHit = {
  url: string;
};

export type Phase1SearchAssertion = {
  /** Query string without encoding (used for failure labels). */
  query: string;
  /** Human-readable label for failure output. */
  label: string;
  assertResults: (results: SearchResultHit[]) => string | null;
};

export type Phase1SearchCheckFailure = {
  route: string;
  status: number | null;
  reason: string;
};

function resultsIncludeUrl(
  results: readonly SearchResultHit[],
  pageUrl: string,
): boolean {
  return results.some(
    (result) => result.url === pageUrl || result.url.startsWith(`${pageUrl}#`),
  );
}

function resultsIncludeGroupedQueryAttention(
  results: readonly SearchResultHit[],
): boolean {
  return resultsIncludeUrl(results, PHASE_1_GROUPED_QUERY_ATTENTION_URL);
}

function resultsIncludeAttentionModule(
  results: readonly SearchResultHit[],
): boolean {
  return resultsIncludeUrl(results, PHASE_1_ATTENTION_MODULE_URL);
}

function resultsIncludeVectorGlossary(
  results: readonly SearchResultHit[],
): boolean {
  return resultsIncludeUrl(results, PHASE_1_VECTOR_GLOSSARY_URL);
}

function resultsIncludeHiddenSizeGlossary(
  results: readonly SearchResultHit[],
): boolean {
  return resultsIncludeUrl(results, PHASE_1_HIDDEN_SIZE_GLOSSARY_URL);
}

/** Returns a failure reason when API hits include fragment URLs or duplicate pages. */
export function assertCanonicalPageLevelApiResults(
  results: readonly SearchResultHit[],
): string | null {
  if (results.some((result) => result.url.includes("#"))) {
    return "search hit URL includes a hash fragment";
  }

  const bases = results.map((result) => pageBaseUrl(result.url));
  if (new Set(bases).size !== bases.length) {
    return "multiple search hits duplicate one canonical page URL";
  }

  return null;
}

function parseSearchResultsJson(body: string): {
  results: SearchResultHit[] | null;
  reason: string | null;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return { results: null, reason: "response body is not valid JSON" };
  }

  if (!Array.isArray(parsed)) {
    return { results: null, reason: "expected JSON array of search hits" };
  }

  for (const [index, entry] of parsed.entries()) {
    if (
      typeof entry !== "object" ||
      entry === null ||
      typeof (entry as { url?: unknown }).url !== "string"
    ) {
      return {
        results: null,
        reason: `hit at index ${index} is missing a string url`,
      };
    }
  }

  return { results: parsed as SearchResultHit[], reason: null };
}

/** Phase 1 manual-gate /api/search queries and ranking expectations. */
export const PHASE_1_SEARCH_ASSERTIONS: readonly Phase1SearchAssertion[] = [
  {
    query: "GQA",
    label: "/api/search?query=GQA",
    assertResults: (results) => {
      if (results.length === 0) {
        return "expected at least one search hit";
      }
      const canonicalReason = assertCanonicalPageLevelApiResults(results);
      if (canonicalReason) {
        return canonicalReason;
      }
      if (results[0]?.url !== PHASE_1_GROUPED_QUERY_ATTENTION_URL) {
        return `first hit URL must be ${PHASE_1_GROUPED_QUERY_ATTENTION_URL}, got ${results[0]?.url ?? "none"}`;
      }
      return null;
    },
  },
  {
    query: "attention",
    label: "/api/search?query=attention",
    assertResults: (results) => {
      if (results.length === 0) {
        return "expected at least one search hit";
      }
      const canonicalReason = assertCanonicalPageLevelApiResults(results);
      if (canonicalReason) {
        return canonicalReason;
      }
      if (!resultsIncludeAttentionModule(results)) {
        return `expected hit for ${PHASE_1_ATTENTION_MODULE_URL}`;
      }
      if (!resultsIncludeGroupedQueryAttention(results)) {
        return `expected hit for ${PHASE_1_GROUPED_QUERY_ATTENTION_URL}`;
      }
      return null;
    },
  },
  {
    query: "vector",
    label: "/api/search?query=vector",
    assertResults: (results) => {
      if (results.length === 0) {
        return "expected at least one search hit";
      }
      const canonicalReason = assertCanonicalPageLevelApiResults(results);
      if (canonicalReason) {
        return canonicalReason;
      }
      if (!resultsIncludeVectorGlossary(results)) {
        return `expected hit for ${PHASE_1_VECTOR_GLOSSARY_URL}`;
      }
      return null;
    },
  },
  {
    query: "hidden size",
    label: "/api/search?query=hidden%20size",
    assertResults: (results) => {
      if (results.length === 0) {
        return "expected at least one search hit";
      }
      const canonicalReason = assertCanonicalPageLevelApiResults(results);
      if (canonicalReason) {
        return canonicalReason;
      }
      if (!resultsIncludeHiddenSizeGlossary(results)) {
        return `expected hit for ${PHASE_1_HIDDEN_SIZE_GLOSSARY_URL}`;
      }
      return null;
    },
  },
  {
    query: "KV cache",
    label: "/api/search?query=KV%20cache",
    assertResults: (results) => {
      if (results.length === 0) {
        return "expected at least one search hit";
      }
      const canonicalReason = assertCanonicalPageLevelApiResults(results);
      if (canonicalReason) {
        return canonicalReason;
      }
      if (!resultsIncludeGroupedQueryAttention(results)) {
        return `expected hit for ${PHASE_1_GROUPED_QUERY_ATTENTION_URL}`;
      }
      return null;
    },
  },
] as const;

export type RunPhase1SearchChecksOptions = {
  timeoutMs?: number;
  searches?: readonly Phase1SearchAssertion[];
};

export function formatPhase1SearchCheckFailure(
  failure: Phase1SearchCheckFailure,
): string {
  const statusLabel =
    failure.status === null ? "no response" : `HTTP ${failure.status}`;
  return `${failure.route}: ${statusLabel} — ${failure.reason}`;
}

/**
 * Timed GET for each Phase 1 /api/search query; returns failures (empty when all pass).
 */
export async function runPhase1SearchChecks(
  baseUrl: string,
  options: RunPhase1SearchChecksOptions = {},
): Promise<Phase1SearchCheckFailure[]> {
  const normalizedBase = normalizeVerifyBaseUrl(baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const searches = options.searches ?? PHASE_1_SEARCH_ASSERTIONS;
  const failures: Phase1SearchCheckFailure[] = [];

  for (const search of searches) {
    const url = `${normalizedBase}/api/search?query=${encodeURIComponent(search.query)}`;

    try {
      const { status, body } = await httpGetText(url, timeoutMs);

      if (status !== 200) {
        failures.push({
          route: search.label,
          status,
          reason: "expected HTTP 200",
        });
        continue;
      }

      const { results, reason: parseReason } = parseSearchResultsJson(body);
      if (parseReason || results === null) {
        failures.push({
          route: search.label,
          status,
          reason: parseReason ?? "failed to parse search results",
        });
        continue;
      }

      const rankingReason = search.assertResults(results);
      if (rankingReason) {
        failures.push({
          route: search.label,
          status,
          reason: rankingReason,
        });
      }
    } catch (error) {
      const reason =
        error instanceof FetchTimeoutError
          ? `request timed out after ${error.timeoutMs}ms`
          : error instanceof Error
            ? error.message
            : String(error);
      failures.push({
        route: search.label,
        status: null,
        reason,
      });
    }
  }

  return failures;
}

/**
 * Runs Phase 1 search checks, prints each failure, and throws when any check fails.
 */
export async function assertPhase1Search(
  baseUrl: string,
  options: RunPhase1SearchChecksOptions = {},
): Promise<void> {
  const failures = await runPhase1SearchChecks(baseUrl, options);

  if (failures.length === 0) {
    return;
  }

  for (const failure of failures) {
    console.error(formatPhase1SearchCheckFailure(failure));
  }

  throw new Error(
    `Phase 1 search verification failed (${failures.length} query/queries)`,
  );
}
