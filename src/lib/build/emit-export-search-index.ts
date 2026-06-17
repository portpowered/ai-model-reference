import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { supportedLocales } from "@/lib/i18n/locale-routing";
import { docsSearchApi } from "@/lib/search/search-server";
import {
  type AdvancedOramaExportPayload,
  resolveExportSearchBootstrapFilePath,
} from "./export-search-bootstrap";
import {
  DEFAULT_EXPORT_OUT_DIR,
  verifyExportOutDirectory,
} from "./verify-phase-1-export-routes";

export type EmitExportSearchIndexOptions = {
  outDir?: string;
  cwd?: string;
};

export type EmitExportSearchIndexResult =
  | { ok: true; filePaths: string[] }
  | { ok: false; reason: string };

/** Writes the Fumadocs advanced Orama export to the static bootstrap path in `out/`. */
export async function emitExportSearchIndex(
  options: EmitExportSearchIndexOptions = {},
): Promise<EmitExportSearchIndexResult> {
  const outDir = options.outDir ?? DEFAULT_EXPORT_OUT_DIR;
  const cwd = options.cwd ?? process.cwd();

  const directoryResult = verifyExportOutDirectory(outDir, cwd);
  if (!directoryResult.ok) {
    return directoryResult;
  }

  const filePaths: string[] = [];

  for (const locale of supportedLocales) {
    const payload = (await docsSearchApi.export(
      locale,
    )) as AdvancedOramaExportPayload;
    if (payload.type !== "advanced") {
      return {
        ok: false,
        reason: `Expected advanced Orama export payload, received type "${String(payload.type)}" for locale "${locale}".`,
      };
    }

    const filePath = resolveExportSearchBootstrapFilePath(outDir, cwd, locale);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, `${JSON.stringify(payload)}\n`, "utf8");
    filePaths.push(filePath);
  }

  return {
    ok: true,
    filePaths,
  };
}
