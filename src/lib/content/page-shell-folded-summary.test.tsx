import { describe, expect, test } from "bun:test";
import { loadModulePage } from "@/lib/content/module-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";

describe("page shell opening layout", () => {
  for (const slug of ["grouped-query-attention", "attention"] as const) {
    test(`${slug} module renders At a glance before the first content section without a folded summary block`, async () => {
      const page = await loadModulePage(slug);
      const html = renderModuleDocsShell(page);

      const atAGlanceIndex = html.indexOf('aria-label="At a glance"');
      const whatItIsIndex = html.indexOf('id="what-it-is"');

      expect(html).not.toContain('data-testid="folded-summary"');
      expect(html).not.toContain('data-opening-summary="folded"');
      if (atAGlanceIndex >= 0) {
        expect(atAGlanceIndex).toBeLessThan(whatItIsIndex);
      }
      expect(whatItIsIndex).toBeGreaterThanOrEqual(0);
    });
  }
});
