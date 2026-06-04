import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  REQUIRED_BUILD_STATIC_ROUTES,
  verifyRequiredBuildStaticRoutesFromManifest,
} from "../src/lib/build/verify-phase-1-static-routes";

const DEFAULT_MANIFEST_PATH = join(
  process.cwd(),
  ".next/app-path-routes-manifest.json",
);

const manifestPath = process.argv[2] ?? DEFAULT_MANIFEST_PATH;

if (!existsSync(manifestPath)) {
  console.error(
    `Missing ${manifestPath} — run \`bun run build\` first or pass a fixture manifest path.`,
  );
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<
  string,
  string
>;
const result = verifyRequiredBuildStaticRoutesFromManifest(manifest);

if (!result.ok) {
  console.error("Required static routes missing from build output:");
  for (const route of result.missing) {
    console.error(`  - ${route}`);
  }
  console.error(
    "Built routes:",
    [...new Set(Object.values(manifest))].sort().join(", "),
  );
  process.exit(1);
}

console.log(
  `Required static routes verified (${REQUIRED_BUILD_STATIC_ROUTES.length} paths).`,
);
