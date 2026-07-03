import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Browser, Page } from "playwright";
import {
  closePlaywrightBrowserWithTimeout,
  launchPlaywrightBrowser,
} from "./launch-playwright-browser";
import {
  RENDERED_QUALITY_VIEWPORTS,
  type RenderedQualityViewport,
} from "./rendered-quality-baseline";

const ROOFLINE_VIEWPORT_THEME_CSS_PATH = join(
  process.cwd(),
  "src/features/roofline-throughput-explorer/roofline-throughput-explorer-viewport-theme.css",
);

export type RooflineThroughputExplorerViewportProbe = {
  regionCount: number;
  regionsVisible: boolean;
  overlappingRegionPairs: number;
  controlsFitViewportWidth: boolean;
};

function buildBrowserFixtureHtml(bodyHtml: string): string {
  const css = readFileSync(ROOFLINE_VIEWPORT_THEME_CSS_PATH, "utf8");
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { margin: 0; font-family: system-ui, sans-serif; }
      ${css}
    </style>
  </head>
  <body>${bodyHtml}</body>
</html>`;
}

async function readViewportProbe(
  page: Page,
  viewportWidth: number,
): Promise<RooflineThroughputExplorerViewportProbe> {
  return page.evaluate((width) => {
    const layout = document.querySelector(
      '[data-roofline-control-layout="controls"]',
    );
    const layoutRect = layout?.getBoundingClientRect();
    const controlsFitViewportWidth = Boolean(
      layoutRect && layoutRect.width <= width + 1,
    );

    const regions = Array.from(
      document.querySelectorAll("[data-roofline-control-region]"),
    );
    const rects = regions
      .map((region) => region.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0);

    let overlappingRegionPairs = 0;
    for (let index = 0; index < rects.length; index += 1) {
      for (
        let otherIndex = index + 1;
        otherIndex < rects.length;
        otherIndex += 1
      ) {
        const left = rects[index];
        const right = rects[otherIndex];
        if (!left || !right) {
          continue;
        }

        const overlapWidth =
          Math.min(left.right, right.right) - Math.max(left.left, right.left);
        const overlapHeight =
          Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top);
        if (overlapWidth > 1 && overlapHeight > 1) {
          overlappingRegionPairs += 1;
        }
      }
    }

    return {
      regionCount: regions.length,
      regionsVisible: rects.length >= 3,
      overlappingRegionPairs,
      controlsFitViewportWidth,
    };
  }, viewportWidth);
}

export async function probeRooflineThroughputExplorerAtViewport(
  bodyHtml: string,
  viewport: { width: number; height: number },
  options: {
    launchBrowser?: () => Promise<Browser>;
  } = {},
): Promise<RooflineThroughputExplorerViewportProbe> {
  const launchBrowser = options.launchBrowser ?? launchPlaywrightBrowser;
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport });
  try {
    await page.setContent(buildBrowserFixtureHtml(bodyHtml), {
      waitUntil: "domcontentloaded",
    });

    return await readViewportProbe(page, viewport.width);
  } finally {
    await page.close().catch(() => {});
    await closePlaywrightBrowserWithTimeout(browser);
  }
}

export function formatRooflineThroughputExplorerViewportProbeFailure(
  viewport: RenderedQualityViewport,
  probe: RooflineThroughputExplorerViewportProbe,
): string | null {
  if (probe.regionCount < 3) {
    return `Roofline explorer exposed fewer than three control regions in the ${viewport.label} viewport.`;
  }
  if (!probe.regionsVisible) {
    return `Roofline explorer control regions were not visible in the ${viewport.label} viewport.`;
  }
  if (!probe.controlsFitViewportWidth) {
    return `Roofline explorer controls overflowed the ${viewport.label} viewport width.`;
  }
  if (probe.overlappingRegionPairs > 0) {
    return `Roofline explorer control regions overlapped in the ${viewport.label} viewport (${probe.overlappingRegionPairs} pair(s)).`;
  }
  return null;
}

export async function verifyRooflineThroughputExplorerViewports(
  bodyHtml: string,
  options: {
    launchBrowser?: () => Promise<Browser>;
    viewports?: readonly RenderedQualityViewport[];
  } = {},
): Promise<string | null> {
  const viewports = options.viewports ?? RENDERED_QUALITY_VIEWPORTS;
  for (const viewport of viewports) {
    const probe = await probeRooflineThroughputExplorerAtViewport(
      bodyHtml,
      {
        width: viewport.width,
        height: viewport.height,
      },
      options,
    );
    const failure = formatRooflineThroughputExplorerViewportProbeFailure(
      viewport,
      probe,
    );
    if (failure) {
      return failure;
    }
  }
  return null;
}
