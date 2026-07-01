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

const GRAPH_THEME_CSS_PATH = join(
  process.cwd(),
  "src/features/docs/styles/registry-graph-flow-theme.css",
);

export type MultiTokenPredictionGraphViewportProbe = {
  graphVisible: boolean;
  variantTabsFocusable: boolean;
  overlappingNodePairs: number;
  graphFitsViewportWidth: boolean;
};

export function extractMultiTokenPredictionHowItWorksSection(
  html: string,
): string {
  const match = html.match(
    /<section[^>]*\bid="how-it-works"[^>]*>[\s\S]*?<\/section>/i,
  );
  return match?.[0] ?? html;
}

function buildBrowserFixtureHtml(bodyHtml: string): string {
  const css = readFileSync(GRAPH_THEME_CSS_PATH, "utf8");
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
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
): Promise<MultiTokenPredictionGraphViewportProbe> {
  return page.evaluate((width) => {
    const graph = document.querySelector('[data-react-flow-graph="true"]');
    const graphRect = graph?.getBoundingClientRect();
    const graphVisible = Boolean(
      graphRect && graphRect.width > 0 && graphRect.height > 0,
    );
    const graphFitsViewportWidth = Boolean(
      graphRect && graphRect.width <= width,
    );

    const tabs = Array.from(
      document.querySelectorAll("[data-attention-variant-option]"),
    );
    const variantTabsFocusable = tabs.every((tab) => {
      if (!(tab instanceof HTMLElement)) {
        return false;
      }
      tab.focus();
      return document.activeElement === tab;
    });

    const nodeRects = Array.from(
      document.querySelectorAll("[data-graph-node-id]"),
    )
      .map((node) => node.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0);

    let overlappingNodePairs = 0;
    for (let index = 0; index < nodeRects.length; index += 1) {
      for (let inner = index + 1; inner < nodeRects.length; inner += 1) {
        const left = nodeRects[index];
        const right = nodeRects[inner];
        if (!left || !right) {
          continue;
        }

        const overlapWidth =
          Math.min(left.right, right.right) - Math.max(left.left, right.left);
        const overlapHeight =
          Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top);
        if (overlapWidth > 8 && overlapHeight > 8) {
          overlappingNodePairs += 1;
        }
      }
    }

    return {
      graphVisible,
      variantTabsFocusable,
      overlappingNodePairs,
      graphFitsViewportWidth,
    };
  }, viewportWidth);
}

export async function probeMultiTokenPredictionGraphAtViewport(
  bodyHtml: string,
  viewport: { width: number; height: number },
  options: {
    launchBrowser?: () => Promise<Browser>;
  } = {},
): Promise<MultiTokenPredictionGraphViewportProbe> {
  const launchBrowser = options.launchBrowser ?? launchPlaywrightBrowser;
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport });
  try {
    await page.setContent(
      buildBrowserFixtureHtml(
        extractMultiTokenPredictionHowItWorksSection(bodyHtml),
      ),
      {
        waitUntil: "domcontentloaded",
      },
    );

    return await readViewportProbe(page, viewport.width);
  } finally {
    await page.close().catch(() => {});
    await closePlaywrightBrowserWithTimeout(browser);
  }
}

export function formatMultiTokenPredictionViewportProbeFailure(
  viewport: RenderedQualityViewport,
  probe: MultiTokenPredictionGraphViewportProbe,
): string | null {
  if (!probe.graphVisible) {
    return `MTP graph was not visible in the ${viewport.label} viewport.`;
  }
  if (!probe.variantTabsFocusable) {
    return `MTP comparison tabs were not keyboard-focusable in the ${viewport.label} viewport.`;
  }
  if (!probe.graphFitsViewportWidth) {
    return `MTP graph overflowed the ${viewport.label} viewport width.`;
  }
  if (viewport.id === "desktop" && probe.overlappingNodePairs > 0) {
    return `MTP graph nodes overlapped in the ${viewport.label} viewport (${probe.overlappingNodePairs} pair(s)).`;
  }
  return null;
}

export async function verifyMultiTokenPredictionGraphViewports(
  bodyHtml: string,
  options: {
    launchBrowser?: () => Promise<Browser>;
    viewports?: readonly RenderedQualityViewport[];
  } = {},
): Promise<string | null> {
  const viewports = options.viewports ?? RENDERED_QUALITY_VIEWPORTS;
  for (const viewport of viewports) {
    const probe = await probeMultiTokenPredictionGraphAtViewport(
      bodyHtml,
      {
        width: viewport.width,
        height: viewport.height,
      },
      options,
    );
    const failure = formatMultiTokenPredictionViewportProbeFailure(
      viewport,
      probe,
    );
    if (failure) {
      return failure;
    }
  }
  return null;
}
