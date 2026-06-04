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

/** Phase 2 taxonomy glossary pages required in the build manifest. */
export const PHASE_2_TAXONOMY_GLOSSARY_ROUTES = [
  "/docs/glossary/model",
  "/docs/glossary/architecture",
  "/docs/glossary/module",
  "/docs/glossary/component",
  "/docs/glossary/modality",
  "/docs/glossary/foundation-model",
  "/docs/glossary/generative-model",
  "/docs/glossary/discriminative-model",
  "/docs/glossary/representation",
] as const;

/** All static routes verified after `bun run build`. */
export const REQUIRED_BUILD_STATIC_ROUTES = [
  ...PHASE_1_STATIC_ROUTES,
  ...PHASE_2_TAXONOMY_GLOSSARY_ROUTES,
] as const;

export type Phase1StaticRoute = (typeof PHASE_1_STATIC_ROUTES)[number];

export type RequiredBuildStaticRoute =
  (typeof REQUIRED_BUILD_STATIC_ROUTES)[number];

/** Returns required build routes absent from the manifest values. */
export function missingRequiredBuildStaticRoutes(
  manifest: Record<string, string>,
): RequiredBuildStaticRoute[] {
  const builtRoutes = new Set(Object.values(manifest));
  return REQUIRED_BUILD_STATIC_ROUTES.filter(
    (route) => !builtRoutes.has(route),
  );
}

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

export type RequiredBuildStaticRouteVerification =
  | { ok: true }
  | { ok: false; missing: RequiredBuildStaticRoute[] };

export function verifyRequiredBuildStaticRoutesFromManifest(
  manifest: Record<string, string>,
): RequiredBuildStaticRouteVerification {
  const missing = missingRequiredBuildStaticRoutes(manifest);
  if (missing.length > 0) {
    return { ok: false, missing };
  }
  return { ok: true };
}
