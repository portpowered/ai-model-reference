import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { shouldRunVerifyProductionIntegrationTests } from "./server-lifecycle";

/**
 * Gates file-based built HTML convergence tests: skip the coverage subprocess
 * rerun (`make ci` runs the full suite twice) and require a completed build.
 */
export function shouldRunBuiltHtmlFileConvergenceTests(
  projectRoot: string = process.cwd(),
  env: Record<string, string | undefined> = process.env,
): boolean {
  return shouldRunVerifyProductionIntegrationTests(projectRoot, env);
}

/** Reads a built route HTML file only when convergence tests should run. */
export function readBuiltHtmlForConvergenceTests(
  relativePath: string,
  projectRoot: string = process.cwd(),
  env: Record<string, string | undefined> = process.env,
): string | null {
  if (!shouldRunBuiltHtmlFileConvergenceTests(projectRoot, env)) {
    return null;
  }

  const absolutePath = join(projectRoot, relativePath);
  if (!existsSync(absolutePath)) {
    return null;
  }

  return readFileSync(absolutePath, "utf8");
}
