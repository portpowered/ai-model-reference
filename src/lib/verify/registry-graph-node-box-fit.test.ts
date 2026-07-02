import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  closePlaywrightBrowserWithTimeout,
  launchPlaywrightBrowser,
} from "./launch-playwright-browser";

type BoxFitMetrics = {
  clientHeight: number;
  scrollHeight: number;
  clientWidth: number;
  scrollWidth: number;
  rectHeight: number;
  rectWidth: number;
};

const GRAPH_THEME_CSS_PATH = join(
  process.cwd(),
  "src/features/docs/styles/registry-graph-flow-theme.css",
);

function buildMoEBoxFitFixtureHtml(css: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>${css}</style>
  </head>
  <body>
    <div
      id="process-node"
      class="registry-graph-flow__process-node"
      style="width: 170px; height: 80px;"
    >
      Weighted sum of chosen experts
    </div>
    <div
      id="annotation-node"
      class="registry-graph-flow__annotation"
      style="width: 230px; height: 120px;"
    >
      Most of the expert pool stays inactive for this token
    </div>
  </body>
</html>`;
}

describe("registry graph node box fit", () => {
  test("MoE-style node boxes keep browser content within their declared height", async () => {
    const css = readFileSync(GRAPH_THEME_CSS_PATH, "utf8");
    const browser = await launchPlaywrightBrowser();

    try {
      const page = await browser.newPage({
        viewport: { width: 900, height: 700 },
      });
      await page.setContent(buildMoEBoxFitFixtureHtml(css), {
        waitUntil: "domcontentloaded",
      });

      const metrics = await page.evaluate(() => {
        function read(id: string): BoxFitMetrics {
          const element = document.getElementById(id);
          if (!element) {
            throw new Error(`missing test element ${id}`);
          }
          const rect = element.getBoundingClientRect();
          return {
            clientHeight: element.clientHeight,
            scrollHeight: element.scrollHeight,
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            rectHeight: rect.height,
            rectWidth: rect.width,
          };
        }

        return {
          process: read("process-node"),
          annotation: read("annotation-node"),
        };
      });

      expect(metrics.process.scrollHeight).toBeLessThanOrEqual(
        metrics.process.clientHeight,
      );
      expect(metrics.annotation.scrollHeight).toBeLessThanOrEqual(
        metrics.annotation.clientHeight,
      );
      expect(Math.round(metrics.process.rectHeight)).toBe(80);
      expect(Math.round(metrics.annotation.rectHeight)).toBe(120);
    } finally {
      await closePlaywrightBrowserWithTimeout(browser);
    }
  });
});
