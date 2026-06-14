import { createHash } from "node:crypto";
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import { hasCompleteNextProductionBuild } from "./server-lifecycle";

/** Stored under `.next/` after a trusted `make build` so plain `make test` stays hermetic. */
export const PRODUCTION_INTEGRATION_BUILD_DIGEST_FILENAME =
  "verify-production-integration-build-digest";

/** Opt-in override for local debugging against an untrusted ambient `.next`. */
export const VERIFY_FORCE_PRODUCTION_INTEGRATION_ENV =
  "VERIFY_FORCE_PRODUCTION_INTEGRATION";

const WATCH_ROOTS = [
  "src",
  "package.json",
  "tsconfig.json",
  "next.config.ts",
  "next.config.mjs",
  "next.config.js",
  "bun.lock",
  "bun.lockb",
] as const;

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".next",
  "out",
  ".git",
  "coverage",
]);

function collectDigestEntries(projectRoot: string): string[] {
  const entries: string[] = [];

  function walk(absolutePath: string): void {
    const stat = statSync(absolutePath);
    if (stat.isFile()) {
      entries.push(
        `${relative(projectRoot, absolutePath)}:${stat.size}:${Math.floor(stat.mtimeMs)}`,
      );
      return;
    }
    if (!stat.isDirectory()) {
      return;
    }

    const dirName = absolutePath.split("/").pop();
    if (dirName && SKIP_DIR_NAMES.has(dirName)) {
      return;
    }

    for (const name of readdirSync(absolutePath).sort()) {
      walk(join(absolutePath, name));
    }
  }

  for (const root of WATCH_ROOTS) {
    const absolute = join(projectRoot, root);
    if (existsSync(absolute)) {
      walk(absolute);
    }
  }

  entries.sort();
  return entries;
}

/** Deterministic digest of source inputs that affect production built-app HTML. */
export function computeProductionIntegrationSourceDigest(
  projectRoot: string = process.cwd(),
): string {
  return createHash("sha256")
    .update(collectDigestEntries(projectRoot).join("\n"))
    .digest("hex");
}

export function readStoredProductionIntegrationBuildDigest(
  projectRoot: string = process.cwd(),
): string | null {
  const digestPath = join(
    projectRoot,
    ".next",
    PRODUCTION_INTEGRATION_BUILD_DIGEST_FILENAME,
  );
  if (!existsSync(digestPath)) {
    return null;
  }

  const digest = readFileSync(digestPath, "utf8").trim();
  return digest.length > 0 ? digest : null;
}

export function writeProductionIntegrationBuildDigest(
  projectRoot: string = process.cwd(),
): string {
  if (!hasCompleteNextProductionBuild(projectRoot)) {
    throw new Error(
      "Cannot write production integration build digest without a complete `.next` artifact. Run `make build` first.",
    );
  }

  const digest = computeProductionIntegrationSourceDigest(projectRoot);
  const digestPath = join(
    projectRoot,
    ".next",
    PRODUCTION_INTEGRATION_BUILD_DIGEST_FILENAME,
  );
  writeFileSync(digestPath, `${digest}\n`, "utf8");
  return digest;
}

/**
 * True when a completed production build matches the current source digest.
 * Ambient or stale `.next` directories without a matching digest are ignored so
 * `make test` does not fail on hidden local build state.
 */
export function hasTrustedProductionBuildArtifact(
  projectRoot: string = process.cwd(),
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (env[VERIFY_FORCE_PRODUCTION_INTEGRATION_ENV] === "1") {
    return hasCompleteNextProductionBuild(projectRoot);
  }
  if (!hasCompleteNextProductionBuild(projectRoot)) {
    return false;
  }

  const storedDigest = readStoredProductionIntegrationBuildDigest(projectRoot);
  if (!storedDigest) {
    return false;
  }

  return storedDigest === computeProductionIntegrationSourceDigest(projectRoot);
}
