import {
  assertPhase1ExportSearchHandoffFromOutDir,
  DEFAULT_EXPORT_OUT_DIR,
  PHASE_1_STATIC_HANDOFF_SEARCH_ASSERTIONS,
} from "../src/lib/build/run-phase-1-static-handoff-search-checks";

const outDir = process.argv[2] ?? DEFAULT_EXPORT_OUT_DIR;

try {
  await assertPhase1ExportSearchHandoffFromOutDir(outDir);
  console.log(
    `Phase 1 static export search handoff verified (${PHASE_1_STATIC_HANDOFF_SEARCH_ASSERTIONS.length} queries in ${outDir}).`,
  );
} catch (error) {
  console.error("Phase 1 static export search handoff verification failed:");
  console.error(`  ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
