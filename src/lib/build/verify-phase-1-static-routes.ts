import { source } from "@/lib/source";

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

/** Catch-all docs route entry emitted by Next.js static manifests. */
export const DOCS_CATCH_ALL_MANIFEST_ROUTE = "/docs/[[...slug]]";

export type Phase1StaticRoute = (typeof PHASE_1_STATIC_ROUTES)[number];

export type RequiredBuildStaticRoute =
  (typeof REQUIRED_BUILD_STATIC_ROUTES)[number];

function defaultCatchAllDocsSlugs(): Set<string> {
  return new Set(source.generateParams().map((entry) => entry.slug.join("/")));
}

/** Converts `/docs/<slug>` reader URLs into catch-all slug paths. */
export function docsSlugPathFromRoute(route: string): string | null {
  if (!route.startsWith("/docs/")) {
    return null;
  }

  return route.slice("/docs/".length);
}

/** True when a route is explicit in the manifest or covered by docs catch-all params. */
export function isRequiredRoutePresent(
  route: string,
  builtRoutes: Set<string>,
  catchAllDocsSlugs: Set<string>,
): boolean {
  if (builtRoutes.has(route)) {
    return true;
  }

  if (!builtRoutes.has(DOCS_CATCH_ALL_MANIFEST_ROUTE)) {
    return false;
  }

  const slugPath = docsSlugPathFromRoute(route);
  return slugPath !== null && catchAllDocsSlugs.has(slugPath);
}

/** Returns required build routes absent from the manifest values. */
export function missingRequiredBuildStaticRoutes(
  manifest: Record<string, string>,
  catchAllDocsSlugs: Set<string> = defaultCatchAllDocsSlugs(),
): RequiredBuildStaticRoute[] {
  const builtRoutes = new Set(Object.values(manifest));
  return REQUIRED_BUILD_STATIC_ROUTES.filter(
    (route) => !isRequiredRoutePresent(route, builtRoutes, catchAllDocsSlugs),
  );
}

/** Returns Phase 1 routes absent from the built route set (manifest values). */
export function missingPhase1StaticRoutes(
  manifest: Record<string, string>,
  catchAllDocsSlugs: Set<string> = defaultCatchAllDocsSlugs(),
): Phase1StaticRoute[] {
  const builtRoutes = new Set(Object.values(manifest));
  return PHASE_1_STATIC_ROUTES.filter(
    (route) => !isRequiredRoutePresent(route, builtRoutes, catchAllDocsSlugs),
  );
}

export type Phase1StaticRouteVerification =
  | { ok: true }
  | { ok: false; missing: Phase1StaticRoute[] };

export function verifyPhase1StaticRoutesFromManifest(
  manifest: Record<string, string>,
  catchAllDocsSlugs: Set<string> = defaultCatchAllDocsSlugs(),
): Phase1StaticRouteVerification {
  const missing = missingPhase1StaticRoutes(manifest, catchAllDocsSlugs);
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
  catchAllDocsSlugs: Set<string> = defaultCatchAllDocsSlugs(),
): RequiredBuildStaticRouteVerification {
  const missing = missingRequiredBuildStaticRoutes(manifest, catchAllDocsSlugs);
  if (missing.length > 0) {
    return { ok: false, missing };
  }
  return { ok: true };
}
