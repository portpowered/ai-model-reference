/** Phase 1 routes that must appear in Next.js `app-path-routes-manifest.json` after build. */
export const PHASE_1_STATIC_ROUTES = [
  "/",
  "/search",
  "/docs/architecture",
  "/docs/glossary",
  "/tags",
  "/tags/[slug]",
  "/docs/glossary/token",
  "/docs/modules/grouped-query-attention",
] as const;

export type Phase1StaticRoute = (typeof PHASE_1_STATIC_ROUTES)[number];

/** Returns Phase 1 routes absent from the built route set (manifest values). */
export function missingPhase1StaticRoutes(
  manifest: Record<string, string>,
): Phase1StaticRoute[] {
  const builtRoutes = new Set(Object.values(manifest));
  return PHASE_1_STATIC_ROUTES.filter((route) => !builtRoutes.has(route));
}

export type Phase1StaticRouteVerification =
  | { ok: true }
  | { ok: false; missing: Phase1StaticRoute[] };

export function verifyPhase1StaticRoutesFromManifest(
  manifest: Record<string, string>,
): Phase1StaticRouteVerification {
  const missing = missingPhase1StaticRoutes(manifest);
  if (missing.length > 0) {
    return { ok: false, missing };
  }
  return { ok: true };
}
