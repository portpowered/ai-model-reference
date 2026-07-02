import { describe, expect, test } from "bun:test";
import { loadModulePage } from "@/lib/content/module-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";

describe("page shell opening layout", () => {
  for (const slug of ["grouped-query-attention", "attention"] as const) {
    test(`${slug} module renders the shell folded summary before At a glance and the first content section`, async () => {
      const page = await loadModulePage(slug);
      const html = renderModuleDocsShell(page);

      const foldedSummaryIndex = html.indexOf('data-testid="folded-summary"');
      const atAGlanceIndex = html.indexOf('aria-label="At a glance"');
      const whatItIsIndex = html.indexOf('id="what-it-is"');

      expect(foldedSummaryIndex).toBeGreaterThanOrEqual(0);
      if (atAGlanceIndex >= 0) {
        expect(foldedSummaryIndex).toBeLessThan(atAGlanceIndex);
        expect(atAGlanceIndex).toBeLessThan(whatItIsIndex);
      }
      expect(whatItIsIndex).toBeGreaterThanOrEqual(0);
    });
  }
});
