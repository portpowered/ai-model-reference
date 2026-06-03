import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

const APP_ROOT = join(import.meta.dir, "../../app");

/** App Router page modules for Phase 1 discovery and sample doc routes. */
const PHASE_1_PAGE_MODULES = [
  { route: "/", modulePath: "(site)/page.tsx" },
  { route: "/search", modulePath: "(site)/search/page.tsx" },
  {
    route: "/docs/architecture",
    modulePath: "(site)/docs/architecture/page.tsx",
  },
  { route: "/docs/glossary", modulePath: "(site)/docs/glossary/page.tsx" },
  { route: "/tags", modulePath: "(site)/tags/page.tsx" },
  { route: "/tags/attention", modulePath: "(site)/tags/[slug]/page.tsx" },
  {
    route: "/docs/glossary/token",
    modulePath: "docs/glossary/token/page.tsx",
  },
  {
    route: "/docs/modules/grouped-query-attention",
    modulePath: "docs/modules/grouped-query-attention/page.tsx",
  },
] as const;

describe("Phase 1 App Router page modules", () => {
  for (const { route, modulePath } of PHASE_1_PAGE_MODULES) {
    test(`${route} has page module at ${modulePath}`, () => {
      const absolutePath = join(APP_ROOT, modulePath);
      expect(existsSync(absolutePath)).toBe(true);
    });
  }
});
