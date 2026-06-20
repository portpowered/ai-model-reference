import {
  CI_SCRIPT_TIMEOUT_MS_ENV,
  DEFAULT_EXPORT_OUT_DIR,
  formatPhase1ExportSearchUxCheckFailure,
  type Phase1ExportSearchUxCheckFailure,
  resolveCiScriptTimeoutMs,
  resolveExportSearchUxCheckOptionsFromEnv,
  runPhase1ExportSearchUxChecks,
} from "../src/lib/verify/phase-1-export-search-ux-checks";

const outDir = process.argv[2] ?? DEFAULT_EXPORT_OUT_DIR;
const shouldLog =
  process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";

function log(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function createScriptTimeoutError(timeoutMs: number): Error {
  return new Error(
    `verify-phase-1-export-search-ux exceeded ${timeoutMs}ms (env ${CI_SCRIPT_TIMEOUT_MS_ENV})`,
  );
}

async function runWithOptionalTimeout<T>(
  work: Promise<T>,
  timeoutMs: number | null,
): Promise<T> {
  if (timeoutMs === null) {
    return work;
  }

  return await new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(createScriptTimeoutError(timeoutMs));
    }, timeoutMs);

    void work.then(
      (value) => {
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });
}

const scriptTimeoutMs = resolveCiScriptTimeoutMs();

if (shouldLog && scriptTimeoutMs !== null) {
  log(
    `[phase-1-export-search-ux] enforcing overall script timeout of ${scriptTimeoutMs}ms`,
  );
}

let failures: Phase1ExportSearchUxCheckFailure[];
try {
  failures = await runWithOptionalTimeout(
    runPhase1ExportSearchUxChecks({
      ...resolveExportSearchUxCheckOptionsFromEnv(),
      outDir,
      logger: shouldLog ? log : undefined,
    }),
    scriptTimeoutMs,
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}

if (failures.length === 0) {
  console.log("Phase 1 static export search UX verified.");
  process.exit(0);
}

for (const failure of failures) {
  console.error(formatPhase1ExportSearchUxCheckFailure(failure));
}

process.exit(1);
