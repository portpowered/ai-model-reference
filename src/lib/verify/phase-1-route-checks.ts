import { assertGroupedQueryAttentionModuleConvergence } from "./grouped-query-attention-module-convergence";
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
  /** Full request URL (base + path) for stderr output. */
  url: string;
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
    path: "/docs/architecture",
    label: "/docs/architecture",
    assertBody: (html) => requireSubstrings(html, ["Architecture", "Token"]),
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
        'href="/search?tag=attention"',
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
    path: "/docs/glossary/vector",
    label: "/docs/glossary/vector",
    assertBody: (html) => {
      const missing = requireSubstrings(html, [
        "Vector",
        'data-registry-id="concept.vector"',
      ]);
      if (missing) {
        return missing;
      }
      return forbidSubstring(html, "lorem");
    },
  },
  {
    path: "/docs/glossary/hidden-size",
    label: "/docs/glossary/hidden-size",
    assertBody: (html) => {
      const missing = requireSubstrings(html, [
        "Hidden Size",
        'data-registry-id="concept.hidden-size"',
      ]);
      if (missing) {
        return missing;
      }
      return forbidSubstring(html, "lorem");
    },
  },
  {
    path: "/docs/modules/attention",
    label: "/docs/modules/attention",
    assertBody: (html) => {
      const missing = requireSubstrings(html, [
        "Attention",
        'data-registry-id="module.attention"',
        "Phase 1 bridge page",
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
    assertBody: (html) => assertGroupedQueryAttentionModuleConvergence(html),
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
  return `${failure.url}: ${statusLabel} — ${failure.reason}`;
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
          url,
          route: route.label,
          status,
          reason: `expected HTTP 200`,
        });
        return failures;
      }

      const contentReason = route.assertBody(body);
      if (contentReason) {
        failures.push({
          url,
          route: route.label,
          status,
          reason: contentReason,
        });
        return failures;
      }
    } catch (error) {
      const reason =
        error instanceof FetchTimeoutError
          ? `request timed out after ${error.timeoutMs}ms`
          : error instanceof Error
            ? error.message
            : String(error);
      failures.push({
        url,
        route: route.label,
        status: null,
        reason,
      });
      return failures;
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

  const firstFailure = failures[0];
  if (firstFailure) {
    console.error(formatPhase1RouteCheckFailure(firstFailure));
  }

  throw new Error("Phase 1 route verification failed");
}
