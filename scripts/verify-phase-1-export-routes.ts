import { resolveBasePathForExportVerification } from "../src/lib/build/static-export";
import {
  DEFAULT_EXPORT_OUT_DIR,
  formatPhase1ExportRouteFailure,
  PHASE_1_EXPORT_ROUTES,
  verifyPhase1ExportRoutesFromOutDir,
} from "../src/lib/build/verify-phase-1-export-routes";

const outDir = process.argv[2] ?? DEFAULT_EXPORT_OUT_DIR;
const basePath = resolveBasePathForExportVerification(process.env);

const result = verifyPhase1ExportRoutesFromOutDir(outDir, { basePath });

if (!result.ok) {
  console.error("Phase 1 export route verification failed:");
  console.error(`  ${formatPhase1ExportRouteFailure(result)}`);
  process.exit(1);
}

console.log(
  `Phase 1 export routes verified (${PHASE_1_EXPORT_ROUTES.length} paths in ${outDir}).`,
);
