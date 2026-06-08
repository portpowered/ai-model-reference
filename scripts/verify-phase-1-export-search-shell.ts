import { DEFAULT_EXPORT_OUT_DIR } from "../src/lib/build/verify-phase-1-export-routes";
import { verifyPhase1ExportSearchShellFromOutDir } from "../src/lib/verify/phase-1-search-export-shell-checks";

const outDir = process.argv[2] ?? DEFAULT_EXPORT_OUT_DIR;

const result = verifyPhase1ExportSearchShellFromOutDir(outDir);

if (!result.ok) {
  console.error("Phase 1 export search shell verification failed:");
  console.error(`  /search: ${result.reason}`);
  process.exit(1);
}

console.log(`Phase 1 export search shell verified (${outDir}/search.html).`);
