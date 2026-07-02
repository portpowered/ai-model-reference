import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  closePlaywrightBrowserWithTimeout,
  launchPlaywrightBrowser,
} from "@/lib/verify/launch-playwright-browser";
import {
  acquireVerifyServerSession,
  shouldRunVerifyProductionIntegrationTests,
} from "@/lib/verify/server-lifecycle";

const repoRoot = join(import.meta.dir, "../../..");

const BROWSE_CATEGORY_HEADING_IDS = [
  "model-types-heading",
  "inference-heading",
  "module-components-heading",
  "glossary-heading",
] as const;

const BROWSE_REPRESENTATIVE_HREFS = [
  "/docs/glossary/world-model",
  "/docs/glossary/temperature",
  "/docs/glossary/softmax",
  "/docs/glossary/token",
] as const;

const BROWSE_VIEWPORTS = [
  { label: "desktop", width: 1280, height: 800 },
  { label: "narrow", width: 390, height: 844 },
] as const;

describe("glossary decomposition browse built-app verification", () => {
  test.each(
    BROWSE_VIEWPORTS.map((viewport) => [viewport.label, viewport] as const),
  )(
    "served /browse exposes derived glossary categories at %s viewport",
    async (_label, viewport) => {
      if (!shouldRunVerifyProductionIntegrationTests(repoRoot)) {
        return;
      }

      const session = await acquireVerifyServerSession({
        projectRoot: repoRoot,
      });
      const browser = await launchPlaywrightBrowser();

      try {
        const page = await browser.newPage({
          viewport: { width: viewport.width, height: viewport.height },
        });
        page.setDefaultTimeout(30_000);
        await page.goto(`${session.baseUrl}/browse`, {
          waitUntil: "load",
        });

        for (const headingId of BROWSE_CATEGORY_HEADING_IDS) {
          await page.locator(`#${headingId}`).waitFor({ state: "visible" });
        }

        for (const href of BROWSE_REPRESENTATIVE_HREFS) {
          await page.locator(`a[href="${href}"]`).first().waitFor({
            state: "visible",
          });
        }

        const bodyText = await page.locator("main").innerText();
        expect(bodyText).toContain("Model Types");
        expect(bodyText).toContain("Inference");
        expect(bodyText).toContain("Module Components");
        expect(bodyText).toContain("Glossary");

        await page.close();
      } finally {
        await closePlaywrightBrowserWithTimeout(browser);
        await session.cleanup();
      }
    },
    120_000,
  );
});
