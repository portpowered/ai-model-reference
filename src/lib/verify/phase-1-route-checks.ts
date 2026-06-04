import {
  DEFAULT_FETCH_TIMEOUT_MS,
  FetchTimeoutError,
  httpGetText,
} from "./http-harness";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

export type Phase1RouteAssertion = {
  path: string;
  /** Human-readable route label for failure output. */
  label: string;
  assertBody: (html: string) => string | null;
};

export type Phase1RouteCheckFailure = {
  route: string;
  status: number | null;
  reason: string;
};

function requireSubstrings(
  html: string,
  substrings: readonly string[],
): string | null {
  for (const substring of substrings) {
    if (!html.includes(substring)) {
      return `missing expected content: ${substring}`;
    }
  }
  return null;
}

function forbidSubstring(html: string, substring: string): string | null {
  if (html.includes(substring)) {
    return `unexpected content: ${substring}`;
  }
  return null;
}

/** Phase 1 manual-gate reader routes and HTML content markers. */
export const PHASE_1_ROUTE_ASSERTIONS: readonly Phase1RouteAssertion[] = [
  {
    path: "/",
    label: "/",
    assertBody: (html) => requireSubstrings(html, ["Model Atlas"]),
  },
  {
    path: "/search",
    label: "/search",
    assertBody: (html) => requireSubstrings(html, ["Search"]),
  },
  {
    path: "/docs/glossary",
    label: "/docs/glossary",
    assertBody: (html) => requireSubstrings(html, ["Glossary", "Token"]),
  },
  {
    path: "/tags",
    label: "/tags",
    assertBody: (html) => requireSubstrings(html, ["Tags", "/tags/attention"]),
  },
  {
    path: "/tags/attention",
    label: "/tags/attention",
    assertBody: (html) => {
      const missing = requireSubstrings(html, [
        "Attention",
        'href="/docs/modules/grouped-query-attention"',
        'href="/docs/glossary/token"',
      ]);
      if (missing) {
        return missing;
      }
      return forbidSubstring(html, "lorem");
    },
  },
  {
    path: "/docs/glossary/token",
    label: "/docs/glossary/token",
    assertBody: (html) => {
      const missing = requireSubstrings(html, [
        "Token",
        'data-registry-id="concept.token"',
      ]);
      if (missing) {
        return missing;
      }
      return forbidSubstring(html, "lorem");
    },
  },
  {
    path: "/docs/modules/grouped-query-attention",
    label: "/docs/modules/grouped-query-attention",
    assertBody: (html) => {
      const missing = requireSubstrings(html, [
        "Grouped-Query Attention",
        'data-registry-id="module.grouped-query-attention"',
      ]);
      if (missing) {
        return missing;
      }
      return forbidSubstring(html, "lorem");
    },
  },
] as const;

export type RunPhase1RouteChecksOptions = {
  timeoutMs?: number;
  routes?: readonly Phase1RouteAssertion[];
};

export function formatPhase1RouteCheckFailure(
  failure: Phase1RouteCheckFailure,
): string {
  const statusLabel =
    failure.status === null ? "no response" : `HTTP ${failure.status}`;
  return `${failure.route}: ${statusLabel} — ${failure.reason}`;
}

/**
 * Timed GET for each Phase 1 reader route; returns failures (empty when all pass).
 */
export async function runPhase1RouteChecks(
  baseUrl: string,
  options: RunPhase1RouteChecksOptions = {},
): Promise<Phase1RouteCheckFailure[]> {
  const normalizedBase = normalizeVerifyBaseUrl(baseUrl);
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const routes = options.routes ?? PHASE_1_ROUTE_ASSERTIONS;
  const failures: Phase1RouteCheckFailure[] = [];

  for (const route of routes) {
    const url = `${normalizedBase}${route.path}`;

    try {
      const { status, body } = await httpGetText(url, timeoutMs);

      if (status !== 200) {
        failures.push({
          route: route.label,
          status,
          reason: `expected HTTP 200`,
        });
        continue;
      }

      const contentReason = route.assertBody(body);
      if (contentReason) {
        failures.push({
          route: route.label,
          status,
          reason: contentReason,
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
        route: route.label,
        status: null,
        reason,
      });
    }
  }

  return failures;
}

/**
 * Runs Phase 1 route checks, prints each failure, and throws when any check fails.
 */
export async function assertPhase1Routes(
  baseUrl: string,
  options: RunPhase1RouteChecksOptions = {},
): Promise<void> {
  const failures = await runPhase1RouteChecks(baseUrl, options);

  if (failures.length === 0) {
    return;
  }

  for (const failure of failures) {
    console.error(formatPhase1RouteCheckFailure(failure));
  }

  throw new Error(
    `Phase 1 route verification failed (${failures.length} route(s))`,
  );
}
