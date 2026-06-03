import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MANIFEST_PATH = join(
  process.cwd(),
  ".next/app-path-routes-manifest.json",
);

const PHASE_1_STATIC_ROUTES = [
  "/",
  "/search",
  "/docs/architecture",
  "/docs/glossary",
  "/tags",
  "/tags/[slug]",
  "/docs/glossary/token",
  "/docs/modules/grouped-query-attention",
] as const;

if (!existsSync(MANIFEST_PATH)) {
  console.error(
    "Missing .next/app-path-routes-manifest.json — run `bun run build` first.",
  );
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Record<
  string,
  string
>;
const builtRoutes = new Set(Object.values(manifest));
const missing = PHASE_1_STATIC_ROUTES.filter(
  (route) => !builtRoutes.has(route),
);

if (missing.length > 0) {
  console.error("Phase 1 static routes missing from build output:");
  for (const route of missing) {
    console.error(`  - ${route}`);
  }
  console.error("Built routes:", [...builtRoutes].sort().join(", "));
  process.exit(1);
}

console.log(
  `Phase 1 static routes verified (${PHASE_1_STATIC_ROUTES.length} paths).`,
);
