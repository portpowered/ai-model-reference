import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveBasePathForExportVerification } from "@/lib/build/static-export";
import {
  exportHtmlReferencesBasePathAssets,
  exportHtmlReferencesBasePathInternalLinks,
} from "@/lib/build/verify-export-base-path";
import {
  DEFAULT_EXPORT_OUT_DIR,
  PHASE_1_EXPORT_ROUTES,
  type Phase1ExportRoute,
  resolveExportHtmlFilePath,
  verifyExportOutDirectory,
  verifyPhase1ExportRouteFromFile,
} from "@/lib/build/verify-phase-1-export-routes";

export const EXPORT_ARTIFACT_DOMAIN_ID = "export-artifact" as const;

export const EXPORT_ARTIFACT_DOMAIN_LABEL =
  "GitHub Pages static export artifact (out/)";

export const EXPORT_ARTIFACT_CHECKLIST_ROW =
  "phase-1-github-pages-export-artifact";

export type ExportArtifactStatus = "pass" | "fail" | "uncertain";

export type ExportArtifactCheckRow = {
  checkId: string;
  title: string;
  status: ExportArtifactStatus;
  reason?: string;
  checklistRow: string;
};

export type ExportArtifactEvidence = {
  domainId: typeof EXPORT_ARTIFACT_DOMAIN_ID;
  label: string;
  checklistRow: string;
  status: ExportArtifactStatus;
  rows: readonly ExportArtifactCheckRow[];
};

export type DeriveExportArtifactEvidenceInput = {
  outDir?: string;
  cwd?: string;
  basePath?: string;
};

const OUT_INDEX_HTML_CHECK_ID = "export-artifact.out-index-html" as const;
const BASE_PATH_ASSETS_CHECK_ID = "export-artifact.base-path.assets" as const;
const BASE_PATH_INTERNAL_LINKS_CHECK_ID =
  "export-artifact.base-path.internal-links" as const;

const BASE_PATH_UNCONFIGURED_REASON =
  "GITHUB_PAGES_BASE_PATH is unset; base-path artifact markers are not applicable.";

function routeCheckId(route: Phase1ExportRoute): string {
  if (route === "/") {
    return "export-artifact.route.home";
  }

  return `export-artifact.route${route.replace(/\//g, "-")}`;
}

function routeCheckTitle(route: Phase1ExportRoute): string {
  return `Exported route ${route} includes reader markers`;
}

function buildCheckRow(
  checkId: string,
  title: string,
  status: ExportArtifactStatus,
  reason?: string,
): ExportArtifactCheckRow {
  return {
    checkId,
    title,
    status,
    reason,
    checklistRow: EXPORT_ARTIFACT_CHECKLIST_ROW,
  };
}

function aggregateStatuses(
  statuses: readonly ExportArtifactStatus[],
): ExportArtifactStatus {
  if (statuses.some((status) => status === "fail")) {
    return "fail";
  }
  if (statuses.some((status) => status === "uncertain")) {
    return "uncertain";
  }
  return "pass";
}

function deriveOutIndexHtmlRow(
  outDir: string,
  cwd: string,
): ExportArtifactCheckRow {
  const directoryResult = verifyExportOutDirectory(outDir, cwd);
  if (directoryResult.ok) {
    return buildCheckRow(
      OUT_INDEX_HTML_CHECK_ID,
      "Non-empty out/index.html exists",
      "pass",
    );
  }

  return buildCheckRow(
    OUT_INDEX_HTML_CHECK_ID,
    "Non-empty out/index.html exists",
    "fail",
    directoryResult.reason,
  );
}

function deriveRouteRows(
  outDir: string,
  cwd: string,
  basePath: string,
): ExportArtifactCheckRow[] {
  return PHASE_1_EXPORT_ROUTES.map((route) => {
    const routeResult = verifyPhase1ExportRouteFromFile(route, {
      outDir,
      cwd,
      basePath,
    });
    if (routeResult.ok) {
      return buildCheckRow(routeCheckId(route), routeCheckTitle(route), "pass");
    }

    return buildCheckRow(
      routeCheckId(route),
      routeCheckTitle(route),
      "fail",
      routeResult.reason,
    );
  });
}

function readIndexHtmlForBasePathChecks(
  outDir: string,
  cwd: string,
): string | null {
  const indexPath = resolveExportHtmlFilePath(outDir, "/", cwd);
  try {
    return readFileSync(indexPath, "utf8");
  } catch {
    return null;
  }
}

function deriveBasePathAssetRow(
  outDir: string,
  basePath: string,
  indexHtml: string | null,
): ExportArtifactCheckRow {
  if (basePath === "") {
    return buildCheckRow(
      BASE_PATH_ASSETS_CHECK_ID,
      "Exported HTML references base-path asset URLs",
      "uncertain",
      BASE_PATH_UNCONFIGURED_REASON,
    );
  }

  if (!indexHtml) {
    return buildCheckRow(
      BASE_PATH_ASSETS_CHECK_ID,
      "Exported HTML references base-path asset URLs",
      "fail",
      `Missing ${join(outDir, "index.html")} for base-path asset marker checks.`,
    );
  }

  if (exportHtmlReferencesBasePathAssets(indexHtml, basePath)) {
    return buildCheckRow(
      BASE_PATH_ASSETS_CHECK_ID,
      "Exported HTML references base-path asset URLs",
      "pass",
    );
  }

  return buildCheckRow(
    BASE_PATH_ASSETS_CHECK_ID,
    "Exported HTML references base-path asset URLs",
    "fail",
    `index.html lacks ${basePath}/_next/ asset references.`,
  );
}

function deriveBasePathInternalLinksRow(
  outDir: string,
  basePath: string,
  indexHtml: string | null,
): ExportArtifactCheckRow {
  if (basePath === "") {
    return buildCheckRow(
      BASE_PATH_INTERNAL_LINKS_CHECK_ID,
      "Exported HTML includes base-path internal doc/tag links",
      "uncertain",
      BASE_PATH_UNCONFIGURED_REASON,
    );
  }

  if (!indexHtml) {
    return buildCheckRow(
      BASE_PATH_INTERNAL_LINKS_CHECK_ID,
      "Exported HTML includes base-path internal doc/tag links",
      "fail",
      `Missing ${join(outDir, "index.html")} for base-path internal-link marker checks.`,
    );
  }

  if (exportHtmlReferencesBasePathInternalLinks(indexHtml, basePath)) {
    return buildCheckRow(
      BASE_PATH_INTERNAL_LINKS_CHECK_ID,
      "Exported HTML includes base-path internal doc/tag links",
      "pass",
    );
  }

  return buildCheckRow(
    BASE_PATH_INTERNAL_LINKS_CHECK_ID,
    "Exported HTML includes base-path internal doc/tag links",
    "fail",
    `index.html lacks internal href markers under ${basePath}.`,
  );
}

function resolveBasePath(input: DeriveExportArtifactEvidenceInput): string {
  if (input.basePath !== undefined) {
    return input.basePath;
  }
  return resolveBasePathForExportVerification(process.env);
}

/**
 * Derives export-artifact pass/fail/uncertain evidence from the built `out/`
 * tree, representative Phase 1 route HTML, and optional GitHub Pages base path.
 */
export function deriveExportArtifactEvidence(
  input: DeriveExportArtifactEvidenceInput = {},
): ExportArtifactEvidence {
  const outDir = input.outDir ?? DEFAULT_EXPORT_OUT_DIR;
  const cwd = input.cwd ?? process.cwd();
  const basePath = resolveBasePath(input);
  const indexHtml = readIndexHtmlForBasePathChecks(outDir, cwd);

  const rows: ExportArtifactCheckRow[] = [
    deriveOutIndexHtmlRow(outDir, cwd),
    ...deriveRouteRows(outDir, cwd, basePath),
    deriveBasePathAssetRow(outDir, basePath, indexHtml),
    deriveBasePathInternalLinksRow(outDir, basePath, indexHtml),
  ];

  return {
    domainId: EXPORT_ARTIFACT_DOMAIN_ID,
    label: EXPORT_ARTIFACT_DOMAIN_LABEL,
    checklistRow: EXPORT_ARTIFACT_CHECKLIST_ROW,
    status: aggregateStatuses(rows.map((row) => row.status)),
    rows,
  };
}

export function formatExportArtifactDomainLine(
  evidence: ExportArtifactEvidence,
): string {
  const status = evidence.status.toUpperCase();
  return `[${status}] ${evidence.domainId} — ${evidence.label} — checklistRow=${evidence.checklistRow}`;
}

export function formatExportArtifactCheckRowLine(
  row: ExportArtifactCheckRow,
): string {
  const status = row.status.toUpperCase();
  const reason = row.status !== "pass" && row.reason ? ` — ${row.reason}` : "";
  return `  [${status}] ${row.checkId} — ${row.title}${reason} — checklistRow=${row.checklistRow}`;
}
