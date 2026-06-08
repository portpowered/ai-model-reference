import {
  DEFAULT_EXPORT_OUT_DIR,
  formatPhase1ExportSearchUxCheckFailure,
  resolveExportSearchUxCheckOptionsFromEnv,
  runPhase1ExportSearchUxChecks,
} from "../src/lib/verify/phase-1-export-search-ux-checks";

const outDir = process.argv[2] ?? DEFAULT_EXPORT_OUT_DIR;

const failures = await runPhase1ExportSearchUxChecks({
  ...resolveExportSearchUxCheckOptionsFromEnv(),
  outDir,
});

if (failures.length === 0) {
  console.log("Phase 1 static export search UX verified.");
  process.exit(0);
}

for (const failure of failures) {
  console.error(formatPhase1ExportSearchUxCheckFailure(failure));
}

process.exit(1);
