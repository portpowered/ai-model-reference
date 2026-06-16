import { describe, expect, test } from "bun:test";
import { loadModulePage } from "@/lib/content/module-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";

describe("page shell opening summary removal", () => {
  for (const slug of ["grouped-query-attention", "attention"] as const) {
    test(`${slug} module omits a rendered summary block and starts with the first content section`, async () => {
      const page = await loadModulePage(slug);
      const html = renderModuleDocsShell(page);

      const foldedIndex = html.indexOf('data-testid="folded-summary"');
      const atAGlanceIndex = html.indexOf('aria-label="At a glance"');
      const whatItIsIndex = html.indexOf('id="what-it-is"');

      expect(foldedIndex).toBe(-1);
      if (atAGlanceIndex >= 0) {
        expect(atAGlanceIndex).toBeLessThan(whatItIsIndex);
      }
      expect(whatItIsIndex).toBeGreaterThanOrEqual(0);
    });
  }
});
