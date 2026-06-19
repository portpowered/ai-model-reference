import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";
import { CANONICAL_GITHUB_PAGES_BASE_PATH } from "./phase-1-github-pages-deploy-workflow";
import { runRouteFamilyHttpConvergenceChecks } from "./route-family-http-convergence-runner";

export type JapaneseAttentionRouteAssertion = {
  path: string;
  label: string;
  assertBody: (html: string) => string | null;
};

export type JapaneseAttentionRouteCheckFailure = {
  url: string;
  route: string;
  status: number | null;
  reason: string;
};

export type RunJapaneseAttentionRouteChecksOptions = {
  timeoutMs?: number;
  routes?: readonly JapaneseAttentionRouteAssertion[];
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

function forbidSubstrings(
  html: string,
  substrings: readonly string[],
): string | null {
  for (const substring of substrings) {
    if (html.includes(substring)) {
      return `unexpected content: ${substring}`;
    }
  }

  return null;
}

function normalizeGitHubPagesBasePath(html: string): string {
  const canonicalBasePath = `/${CANONICAL_GITHUB_PAGES_BASE_PATH}`;
  return html.replaceAll(canonicalBasePath, "");
}

const JAPANESE_ATTENTION_PROOF_SET_HREFS = [
  'href="/ja/docs/modules/multi-head-attention"',
  'href="/ja/docs/modules/multi-query-attention"',
  'href="/ja/docs/modules/linear-attention"',
  'href="/ja/docs/modules/sliding-window-attention"',
] as const;

const JAPANESE_ATTENTION_UNSHIPPED_HREFS = [
  'href="/ja/docs/modules/multi-head-latent-attention"',
  'href="/ja/docs/modules/sparse-attention"',
] as const;

export const JAPANESE_ATTENTION_ROUTE_ASSERTIONS: readonly JapaneseAttentionRouteAssertion[] =
  [
    {
      path: "/ja/tags/attention",
      label: "/ja/tags/attention",
      assertBody: (html) => {
        const visibleHtml = normalizeGitHubPagesBasePath(
          stripHtmlScripts(html),
        );
        const missing = requireSubstrings(visibleHtml, [
          "Attention",
          "このタグを検索",
          'href="/ja/search?tag=attention"',
          'href="/ja/docs/modules/attention"',
          'href="/ja/docs/glossary/token"',
          ...JAPANESE_ATTENTION_PROOF_SET_HREFS,
        ]);
        if (missing) {
          return missing;
        }

        return forbidSubstrings(
          visibleHtml,
          JAPANESE_ATTENTION_UNSHIPPED_HREFS,
        );
      },
    },
    {
      path: "/ja/search?tag=attention",
      label: "/ja/search?tag=attention",
      assertBody: (html) => {
        const visibleHtml = normalizeGitHubPagesBasePath(
          stripHtmlScripts(html),
        );
        const missing = requireSubstrings(visibleHtml, [
          "検索",
          "正規の検索エントリ URL: /search。",
          "/search?tag=attention",
          'data-testid="search-page-idle"',
        ]);
        if (missing) {
          return missing;
        }

        return null;
      },
    },
    {
      path: "/ja/docs/modules/multi-head-attention",
      label: "/ja/docs/modules/multi-head-attention",
      assertBody: (html) => {
        const visibleHtml = normalizeGitHubPagesBasePath(
          stripHtmlScripts(html),
        );
        const missing = requireSubstrings(visibleHtml, [
          "マルチヘッド attention",
          'data-registry-id="module.multi-head-attention"',
          'href="/ja/tags/attention"',
          'href="/ja/docs/modules/attention"',
          'href="/ja/docs/modules/multi-query-attention"',
        ]);
        if (missing) {
          return missing;
        }

        return forbidSubstrings(
          visibleHtml,
          JAPANESE_ATTENTION_UNSHIPPED_HREFS,
        );
      },
    },
    {
      path: "/ja/docs/modules/multi-query-attention",
      label: "/ja/docs/modules/multi-query-attention",
      assertBody: (html) => {
        const visibleHtml = normalizeGitHubPagesBasePath(
          stripHtmlScripts(html),
        );
        const missing = requireSubstrings(visibleHtml, [
          "マルチクエリ attention",
          'data-registry-id="module.multi-query-attention"',
          'href="/ja/tags/attention"',
          'href="/ja/docs/modules/grouped-query-attention"',
          'href="/ja/docs/modules/multi-head-attention"',
          'href="/docs/glossary/kv-cache"',
        ]);
        if (missing) {
          return missing;
        }

        return forbidSubstrings(
          visibleHtml,
          JAPANESE_ATTENTION_UNSHIPPED_HREFS,
        );
      },
    },
    {
      path: "/ja/docs/modules/linear-attention",
      label: "/ja/docs/modules/linear-attention",
      assertBody: (html) => {
        const visibleHtml = normalizeGitHubPagesBasePath(
          stripHtmlScripts(html),
        );
        const missing = requireSubstrings(visibleHtml, [
          "線形 attention",
          'data-registry-id="module.linear-attention"',
          'href="/ja/tags/attention"',
          'href="/ja/docs/modules/multi-head-attention"',
          'href="/ja/docs/modules/multi-query-attention"',
          'data-graph-id="graph.linear-attention-linear-comparison"',
        ]);
        if (missing) {
          return missing;
        }

        return forbidSubstrings(
          visibleHtml,
          JAPANESE_ATTENTION_UNSHIPPED_HREFS,
        );
      },
    },
    {
      path: "/ja/docs/modules/sliding-window-attention",
      label: "/ja/docs/modules/sliding-window-attention",
      assertBody: (html) => {
        const visibleHtml = normalizeGitHubPagesBasePath(
          stripHtmlScripts(html),
        );
        const missing = requireSubstrings(visibleHtml, [
          "スライディングウィンドウ attention",
          'data-registry-id="module.sliding-window-attention"',
          'href="/ja/tags/attention"',
          'href="/ja/docs/modules/multi-head-attention"',
          'href="/ja/docs/modules/multi-query-attention"',
          'data-graph-id="graph.sliding-window-attention-time-window-pattern"',
        ]);
        if (missing) {
          return missing;
        }

        return forbidSubstrings(
          visibleHtml,
          JAPANESE_ATTENTION_UNSHIPPED_HREFS,
        );
      },
    },
  ] as const;

export function formatJapaneseAttentionRouteCheckFailure(
  failure: JapaneseAttentionRouteCheckFailure,
): string {
  const statusLabel =
    failure.status === null ? "no response" : `HTTP ${failure.status}`;
  return `${failure.url}: ${statusLabel} — ${failure.reason}`;
}

export async function runJapaneseAttentionRouteChecks(
  baseUrl: string,
  options: RunJapaneseAttentionRouteChecksOptions = {},
): Promise<JapaneseAttentionRouteCheckFailure[]> {
  const routes = options.routes ?? JAPANESE_ATTENTION_ROUTE_ASSERTIONS;

  return runRouteFamilyHttpConvergenceChecks(baseUrl, {
    timeoutMs: options.timeoutMs,
    routes,
  });
}

export async function assertJapaneseAttentionRouteChecks(
  baseUrl: string,
  options: RunJapaneseAttentionRouteChecksOptions = {},
): Promise<void> {
  const failures = await runJapaneseAttentionRouteChecks(baseUrl, options);

  if (failures.length === 0) {
    return;
  }

  const firstFailure = failures[0];
  if (firstFailure) {
    console.error(formatJapaneseAttentionRouteCheckFailure(firstFailure));
  }

  throw new Error("Phase 4 Japanese attention route verification failed");
}
