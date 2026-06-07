import { emitExportSearchIndex } from "../src/lib/build/emit-export-search-index";
import { DEFAULT_EXPORT_OUT_DIR } from "../src/lib/build/verify-phase-1-export-routes";

const outDir = process.argv[2] ?? DEFAULT_EXPORT_OUT_DIR;

const result = await emitExportSearchIndex({ outDir });

if (!result.ok) {
  console.error("Export search bootstrap emit failed:");
  console.error(`  ${result.reason}`);
  process.exit(1);
}

console.log(`Wrote advanced Orama search bootstrap to ${result.filePath}.`);
