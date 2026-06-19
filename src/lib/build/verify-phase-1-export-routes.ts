import { existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { normalizeGitHubPagesBasePath } from "@/lib/build/static-export";
import {
  exportHtmlIncludesGqaAttentionVariantGraphShellMarkers,
  exportHtmlReferencesBasePathAssets,
} from "@/lib/build/verify-export-base-path";
import { verifyGroupedQueryAttentionBuiltRouteFromHtml } from "@/lib/build/verify-grouped-query-attention-built-route";
import {
  PHASE_1_ROUTE_ASSERTIONS,
  type Phase1RouteAssertion,
} from "@/lib/verify/phase-1-route-checks";

/** Default static export output directory from `bun run build:export`. */
export const DEFAULT_EXPORT_OUT_DIR = "out";

/** Phase 1 reader routes verified in the exported `out/` artifact. */
export const PHASE_1_EXPORT_ROUTES = [
  "/",
  "/search",
  "/docs/architecture",
  "/docs/glossary",
  "/docs/modules/grouped-query-attention",
  "/tags",
  "/tags/attention",
] as const;

export type Phase1ExportRoute = (typeof PHASE_1_EXPORT_ROUTES)[number];

let cachedPhase1ExportRouteAssertions:
  | readonly Phase1RouteAssertion[]
  | undefined;

function getPhase1ExportRouteAssertions(): readonly Phase1RouteAssertion[] {
  if (cachedPhase1ExportRouteAssertions) {
    return cachedPhase1ExportRouteAssertions;
  }

  cachedPhase1ExportRouteAssertions = PHASE_1_EXPORT_ROUTES.map((route) => {
    const assertion = PHASE_1_ROUTE_ASSERTIONS.find(
      (entry) => entry.path === route,
    );
    if (!assertion) {
      throw new Error(
        `Missing Phase 1 route assertion for export route ${route}`,
      );
    }
    return assertion;
  });
  return cachedPhase1ExportRouteAssertions;
}

/** Maps a reader route to its relative HTML path under `out/`. */
export function exportHtmlRelativePath(route: string): string {
  if (route === "/") {
    return "index.html";
  }

  const trimmed = route.startsWith("/") ? route.slice(1) : route;
  return `${trimmed}.html`;
}

/** Resolves the absolute exported HTML file path for a reader route. */
export function resolveExportHtmlFilePath(
  outDir: string,
  route: string,
  cwd: string = process.cwd(),
): string {
  const absoluteOutDir = isAbsolute(outDir) ? outDir : join(cwd, outDir);
  return join(absoluteOutDir, exportHtmlRelativePath(route));
}

/**
 * Strips a GitHub Pages base path from internal hrefs so export HTML can reuse
 * production route content assertions.
 */
export function stripBasePathFromExportHtml(
  html: string,
  basePath: string,
): string {
  const normalizedBase = normalizeGitHubPagesBasePath(basePath);
  if (normalizedBase === "") {
    return html;
  }

  return html
    .replaceAll(`href="${normalizedBase}/`, 'href="/')
    .replaceAll(`href="${normalizedBase}"`, 'href="/"');
}

export function inferBasePathFromExportHtml(html: string): string {
  const assetMatch = html.match(/(?:href|src)="(\/[^"]+)\/_next\//);
  if (assetMatch?.[1]) {
    return assetMatch[1];
  }

  return "";
}

export type VerifyExportOutDirectoryResult =
  | { ok: true }
  | { ok: false; reason: string };

/** Verifies the export directory exists and contains a non-empty `index.html`. */
export function verifyExportOutDirectory(
  outDir: string = DEFAULT_EXPORT_OUT_DIR,
  cwd: string = process.cwd(),
): VerifyExportOutDirectoryResult {
  const absoluteOutDir = isAbsolute(outDir) ? outDir : join(cwd, outDir);
  if (!existsSync(absoluteOutDir)) {
    return {
      ok: false,
      reason: `Missing export directory at ${outDir} — run \`bun run build:export\` first.`,
    };
  }

  const indexPath = join(absoluteOutDir, "index.html");
  if (!existsSync(indexPath)) {
    return {
      ok: false,
      reason: `Missing ${join(outDir, "index.html")} — export directory is empty or incomplete.`,
    };
  }

  const indexSize = statSync(indexPath).size;
  if (indexSize === 0) {
    return {
      ok: false,
      reason: `Export index.html at ${join(outDir, "index.html")} is empty.`,
    };
  }

  return { ok: true };
}

export type VerifyPhase1ExportRouteResult =
  | { ok: true; route: Phase1ExportRoute }
  | { ok: false; route: Phase1ExportRoute; reason: string };

export type VerifyPhase1ExportRoutesOptions = {
  outDir?: string;
  cwd?: string;
  basePath?: string;
};

function assertExportRouteContent(
  route: Phase1ExportRoute,
  html: string,
): string | null {
  if (route === "/docs/modules/grouped-query-attention") {
    const result = verifyGroupedQueryAttentionBuiltRouteFromHtml(html);
    return result.ok ? null : result.reason;
  }

  const assertion = getPhase1ExportRouteAssertions().find(
    (entry) => entry.path === route,
  );
  if (!assertion) {
    return `unknown export route: ${route}`;
  }

  return assertion.assertBody(html);
}

function assertGqaExportGraphShellForBasePath(
  route: Phase1ExportRoute,
  rawHtml: string,
  basePath: string,
): string | null {
  if (route !== "/docs/modules/grouped-query-attention" || basePath === "") {
    return null;
  }

  if (!exportHtmlReferencesBasePathAssets(rawHtml, basePath)) {
    return `GQA export HTML lacks ${basePath}/_next/ asset references required for graph hydration.`;
  }

  if (!exportHtmlIncludesGqaAttentionVariantGraphShellMarkers(rawHtml)) {
    return "GQA export HTML lacks attention-variant comparison graph shell markers.";
  }

  return null;
}

/** Verifies one exported Phase 1 route file exists and includes reader markers. */
export function verifyPhase1ExportRouteFromFile(
  route: Phase1ExportRoute,
  options: VerifyPhase1ExportRoutesOptions = {},
): VerifyPhase1ExportRouteResult {
  const outDir = options.outDir ?? DEFAULT_EXPORT_OUT_DIR;
  const cwd = options.cwd ?? process.cwd();
  const relativeHtmlPath = join(outDir, exportHtmlRelativePath(route));
  const filePath = resolveExportHtmlFilePath(outDir, route, cwd);

  if (!existsSync(filePath)) {
    return {
      ok: false,
      route,
      reason: `Missing exported HTML at ${relativeHtmlPath} for route ${route}.`,
    };
  }

  const rawHtml = readFileSync(filePath, "utf8");
  const basePath = normalizeGitHubPagesBasePath(
    options.basePath || inferBasePathFromExportHtml(rawHtml),
  );
  const html = stripBasePathFromExportHtml(rawHtml, basePath);
  const contentReason = assertExportRouteContent(route, html);
  if (contentReason) {
    return {
      ok: false,
      route,
      reason: contentReason,
    };
  }

  const graphShellReason = assertGqaExportGraphShellForBasePath(
    route,
    rawHtml,
    basePath,
  );
  if (graphShellReason) {
    return {
      ok: false,
      route,
      reason: graphShellReason,
    };
  }

  return { ok: true, route };
}

export type VerifyPhase1ExportRoutesResult =
  | { ok: true }
  | { ok: false; route: Phase1ExportRoute | null; reason: string };

/** Verifies all representative Phase 1 export routes under `out/`. */
export function verifyPhase1ExportRoutesFromOutDir(
  outDir: string = DEFAULT_EXPORT_OUT_DIR,
  options: Omit<VerifyPhase1ExportRoutesOptions, "outDir"> = {},
): VerifyPhase1ExportRoutesResult {
  const cwd = options.cwd ?? process.cwd();
  const directoryResult = verifyExportOutDirectory(outDir, cwd);
  if (!directoryResult.ok) {
    return {
      ok: false,
      route: null,
      reason: directoryResult.reason,
    };
  }

  for (const route of PHASE_1_EXPORT_ROUTES) {
    const routeResult = verifyPhase1ExportRouteFromFile(route, {
      ...options,
      outDir,
      cwd,
    });
    if (!routeResult.ok) {
      return {
        ok: false,
        route: routeResult.route,
        reason: routeResult.reason,
      };
    }
  }

  return { ok: true };
}

export function formatPhase1ExportRouteFailure(
  result: Extract<VerifyPhase1ExportRoutesResult, { ok: false }>,
): string {
  if (result.route === null) {
    return result.reason;
  }

  return `${result.route}: ${result.reason}`;
}
