import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  DOCS_CATCH_ALL_MANIFEST_ROUTE,
  docsSlugPathFromRoute,
  PHASE_1_STATIC_ROUTES,
  verifyPhase1StaticRoutesFromManifest,
} from "@/lib/build/verify-phase-1-static-routes";
import { source } from "@/lib/source";

const APP_ROOT = join(import.meta.dir, "../../app");

/** Explicit App Router pages outside the docs catch-all. */
const EXPLICIT_SITE_PAGE_MODULES = [
  { route: "/", modulePath: "(site)/page.tsx" },
  { route: "/search", modulePath: "(site)/search/page.tsx" },
  {
    route: "/docs/architecture",
    modulePath: "(site)/docs/architecture/page.tsx",
  },
  { route: "/docs/glossary", modulePath: "(site)/docs/glossary/page.tsx" },
  { route: "/tags", modulePath: "(site)/tags/page.tsx" },
  { route: "/tags/attention", modulePath: "(site)/tags/[slug]/page.tsx" },
] as const;

const CATCH_ALL_DOCS_ROUTES = [
  "/docs/glossary/token",
  "/docs/modules/grouped-query-attention",
] as const;

describe("Phase 1 explicit site page modules", () => {
  for (const { route, modulePath } of EXPLICIT_SITE_PAGE_MODULES) {
    test(`${route} has page module at ${modulePath}`, () => {
      const absolutePath = join(APP_ROOT, modulePath);
      expect(existsSync(absolutePath)).toBe(true);
    });
  }
});

describe("Phase 1 catch-all glossary and module URL reachability", () => {
  test("Fumadocs generateParams includes slug paths for Phase 1 doc URLs", () => {
    const slugPaths = new Set(
      source.generateParams().map((entry) => entry.slug.join("/")),
    );

    for (const route of CATCH_ALL_DOCS_ROUTES) {
      const slugPath = docsSlugPathFromRoute(route);
      expect(slugPath).not.toBeNull();
      if (!slugPath) {
        throw new Error(`expected docs slug path for ${route}`);
      }
      expect(slugPaths.has(slugPath)).toBe(true);
    }
  });

  test("Fumadocs source resolves Phase 1 glossary and module pages", () => {
    expect(source.getPage(["glossary", "token"])).toBeDefined();
    expect(
      source.getPage(["modules", "grouped-query-attention"]),
    ).toBeDefined();
  });

  test("catch-all manifest entries cover Phase 1 doc URLs via generateParams", () => {
    const manifest: Record<string, string> = Object.fromEntries(
      PHASE_1_STATIC_ROUTES.map((route) => [`/_app${route}`, route]),
    );
    delete manifest["/_app/docs/glossary/token"];
    delete manifest["/_app/docs/modules/grouped-query-attention"];
    manifest[`/_app${DOCS_CATCH_ALL_MANIFEST_ROUTE}`] =
      DOCS_CATCH_ALL_MANIFEST_ROUTE;

    const result = verifyPhase1StaticRoutesFromManifest(manifest);
    expect(result.ok).toBe(true);
  });
});
