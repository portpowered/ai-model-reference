import { readFileSync } from "node:fs";
import { createModelAtlasSearchClient } from "@/features/docs/search/search-client";
import type { SearchResultMetaRecord } from "@/features/docs/search/search-result-meta-client";
import {
  PHASE_1_SEARCH_ASSERTIONS,
  type Phase1SearchAssertion,
} from "@/lib/verify/phase-1-search-checks";
import { PHASE_1_SEARCH_PAGE_QUERIES } from "@/lib/verify/phase-1-search-page-checks";
import {
  type AdvancedOramaExportPayload,
  resolveExportSearchBootstrapFilePath,
} from "./export-search-bootstrap";
import { verifyPhase1ExportSearchFromOutDir } from "./verify-phase-1-export-search";

/** Synthetic bootstrap URL used when exercising the static handoff in tests. */
export const STATIC_HANDOFF_BOOTSTRAP_FETCH_URL =
  "http://static-handoff.test/api/search";

/** Phase 1 manual-gate queries exercised against the static export bootstrap path. */
export const PHASE_1_STATIC_HANDOFF_SEARCH_ASSERTIONS =
  PHASE_1_SEARCH_ASSERTIONS.filter((assertion) =>
    (PHASE_1_SEARCH_PAGE_QUERIES as readonly string[]).includes(
      assertion.query,
    ),
  );

export type Phase1StaticHandoffSearchCheckFailure = {
  query: string;
  label: string;
  reason: string;
};

export type RunPhase1StaticHandoffSearchChecksOptions = {
  searches?: readonly Phase1SearchAssertion[];
  bootstrapUrl?: string;
};

function parseAdvancedOramaExportPayload(
  raw: string,
): AdvancedOramaExportPayload | null {
  try {
    const payload = JSON.parse(raw) as AdvancedOramaExportPayload;
    if (payload.type !== "advanced") {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/** Returns a fetch mock that serves the export bootstrap payload at the bootstrap URL. */
export function createStaticHandoffBootstrapFetch(
  payload: AdvancedOramaExportPayload,
  bootstrapUrl: string = STATIC_HANDOFF_BOOTSTRAP_FETCH_URL,
): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    if (url === bootstrapUrl) {
      return new Response(JSON.stringify(payload), { status: 200 });
    }
    throw new Error(`Unexpected fetch URL for static handoff checks: ${url}`);
  }) as typeof fetch;
}

export function formatPhase1StaticHandoffSearchCheckFailure(
  failure: Phase1StaticHandoffSearchCheckFailure,
): string {
  return `${failure.label}: ${failure.reason}`;
}

/**
 * Runs Phase 1 search assertions against the static bootstrap handoff path
 * (bootstrap fetch + model atlas collapse), mirroring reader-facing search.
 */
export async function runPhase1StaticHandoffSearchChecks(
  payload: AdvancedOramaExportPayload,
  metaByUrl: SearchResultMetaRecord,
  options: RunPhase1StaticHandoffSearchChecksOptions = {},
): Promise<Phase1StaticHandoffSearchCheckFailure[]> {
  const bootstrapUrl =
    options.bootstrapUrl ?? STATIC_HANDOFF_BOOTSTRAP_FETCH_URL;
  const searches = options.searches ?? PHASE_1_STATIC_HANDOFF_SEARCH_ASSERTIONS;
  const originalFetch = globalThis.fetch;

  globalThis.fetch = createStaticHandoffBootstrapFetch(payload, bootstrapUrl);

  try {
    const client = createModelAtlasSearchClient({
      metaByUrl,
      client: { from: bootstrapUrl },
    });
    const failures: Phase1StaticHandoffSearchCheckFailure[] = [];

    for (const search of searches) {
      const results = await client.search(search.query);
      const rankingReason = search.assertResults(results);
      if (rankingReason) {
        failures.push({
          query: search.query,
          label: search.label,
          reason: rankingReason,
        });
      }
    }

    return failures;
  } finally {
    globalThis.fetch = originalFetch;
  }
}

export type RunPhase1StaticHandoffSearchChecksFromOutDirOptions = {
  cwd?: string;
  searches?: readonly Phase1SearchAssertion[];
};

export type RunPhase1StaticHandoffSearchChecksFromOutDirResult =
  | { ok: true; failures: [] }
  | {
      ok: false;
      failures?: Phase1StaticHandoffSearchCheckFailure[];
      reason?: string;
    };

/** Loads `out/api/search` and runs Phase 1 static handoff search assertions. */
export async function runPhase1StaticHandoffSearchChecksFromOutDir(
  outDir: string,
  metaByUrl: SearchResultMetaRecord,
  options: RunPhase1StaticHandoffSearchChecksFromOutDirOptions = {},
): Promise<RunPhase1StaticHandoffSearchChecksFromOutDirResult> {
  const cwd = options.cwd ?? process.cwd();
  const artifactResult = await verifyPhase1ExportSearchFromOutDir(outDir, {
    cwd,
  });
  if (!artifactResult.ok) {
    return { ok: false, reason: artifactResult.reason };
  }

  const filePath = resolveExportSearchBootstrapFilePath(outDir, cwd);
  const raw = readFileSync(filePath, "utf8");
  const payload = parseAdvancedOramaExportPayload(raw);
  if (!payload) {
    return {
      ok: false,
      reason: `Export search bootstrap at ${outDir}/api/search is not valid advanced Orama JSON.`,
    };
  }

  const failures = await runPhase1StaticHandoffSearchChecks(
    payload,
    metaByUrl,
    { searches: options.searches },
  );

  if (failures.length > 0) {
    return { ok: false, failures };
  }

  return { ok: true, failures: [] };
}
