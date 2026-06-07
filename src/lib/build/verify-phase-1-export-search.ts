import { existsSync, readFileSync } from "node:fs";
import { PHASE_1_GROUPED_QUERY_ATTENTION_URL } from "@/lib/verify/phase-1-search-checks";
import {
  type AdvancedOramaExportPayload,
  EXPORT_SEARCH_BOOTSTRAP_RELATIVE_PATH,
  resolveExportSearchBootstrapFilePath,
} from "./export-search-bootstrap";
import {
  DEFAULT_EXPORT_OUT_DIR,
  verifyExportOutDirectory,
} from "./verify-phase-1-export-routes";

export type VerifyPhase1ExportSearchOptions = {
  outDir?: string;
  cwd?: string;
};

export type VerifyPhase1ExportSearchResult =
  | { ok: true }
  | { ok: false; reason: string };

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

function exportPayloadIncludesPhase1DocumentUrl(
  payload: AdvancedOramaExportPayload,
  documentUrl: string,
): boolean {
  return JSON.stringify(payload).includes(documentUrl);
}

/** Verifies the export artifact contains a fetchable advanced Orama bootstrap payload. */
export async function verifyPhase1ExportSearchFromOutDir(
  outDir: string = DEFAULT_EXPORT_OUT_DIR,
  options: Omit<VerifyPhase1ExportSearchOptions, "outDir"> = {},
): Promise<VerifyPhase1ExportSearchResult> {
  const cwd = options.cwd ?? process.cwd();
  const directoryResult = verifyExportOutDirectory(outDir, cwd);
  if (!directoryResult.ok) {
    return directoryResult;
  }

  const filePath = resolveExportSearchBootstrapFilePath(outDir, cwd);
  const relativePath = `${outDir}/${EXPORT_SEARCH_BOOTSTRAP_RELATIVE_PATH}`;
  if (!existsSync(filePath)) {
    return {
      ok: false,
      reason: `Missing export search bootstrap at ${relativePath} — run the export search emit step after \`bun run build:export\`.`,
    };
  }

  const raw = readFileSync(filePath, "utf8");
  const payload = parseAdvancedOramaExportPayload(raw);
  if (!payload) {
    return {
      ok: false,
      reason: `Export search bootstrap at ${relativePath} is not valid advanced Orama JSON.`,
    };
  }

  const includesGqa = exportPayloadIncludesPhase1DocumentUrl(
    payload,
    PHASE_1_GROUPED_QUERY_ATTENTION_URL,
  );
  if (!includesGqa) {
    return {
      ok: false,
      reason: `Export search bootstrap at ${relativePath} does not index ${PHASE_1_GROUPED_QUERY_ATTENTION_URL}.`,
    };
  }

  return { ok: true };
}

export function formatPhase1ExportSearchFailure(
  result: Extract<VerifyPhase1ExportSearchResult, { ok: false }>,
): string {
  return result.reason;
}
