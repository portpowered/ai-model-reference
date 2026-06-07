import {
  assertPhase1ExportSearchUx,
  resolveExportSearchUxCheckOptionsFromEnv,
} from "../src/lib/verify/phase-1-export-search-ux-checks";

async function main(): Promise<number> {
  try {
    await assertPhase1ExportSearchUx(
      resolveExportSearchUxCheckOptionsFromEnv(),
    );
    console.log("Phase 1 static export search UX verified.");
    return 0;
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(String(error));
    }
    return 1;
  }
}

const exitCode = await main();
process.exit(exitCode);
