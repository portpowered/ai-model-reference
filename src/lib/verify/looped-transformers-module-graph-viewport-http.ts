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

export type LoopedTransformersGraphViewportProbe = {
  graphVisible: boolean;
  overlappingNodePairs: number;
  graphFitsViewportWidth: boolean;
};

export function extractLoopedTransformersHowItWorksSection(
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
): Promise<LoopedTransformersGraphViewportProbe> {
  return page.evaluate((width) => {
    const graph = document.querySelector('[data-react-flow-graph="true"]');
    const graphRect = graph?.getBoundingClientRect();
    const graphVisible = Boolean(
      graphRect && graphRect.width > 0 && graphRect.height > 0,
    );
    const graphFitsViewportWidth = Boolean(
      graphRect && graphRect.width <= width,
    );

    const nodeRects = Array.from(
      document.querySelectorAll(
        ".react-flow__node, .registry-graph-flow__node",
      ),
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
      overlappingNodePairs,
      graphFitsViewportWidth,
    };
  }, viewportWidth);
}

export async function probeLoopedTransformersGraphAtViewport(
  bodyHtml: string,
  viewport: { width: number; height: number },
  options: {
    launchBrowser?: () => Promise<Browser>;
  } = {},
): Promise<LoopedTransformersGraphViewportProbe> {
  const launchBrowser = options.launchBrowser ?? launchPlaywrightBrowser;
  const browser = await launchBrowser();
  const page = await browser.newPage({ viewport });
  try {
    await page.setContent(
      buildBrowserFixtureHtml(
        extractLoopedTransformersHowItWorksSection(bodyHtml),
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

export function formatLoopedTransformersViewportProbeFailure(
  viewport: RenderedQualityViewport,
  probe: LoopedTransformersGraphViewportProbe,
): string | null {
  if (!probe.graphVisible) {
    return `Looped transformers graph was not visible in the ${viewport.label} viewport.`;
  }
  if (!probe.graphFitsViewportWidth) {
    return `Looped transformers graph overflowed the ${viewport.label} viewport width.`;
  }
  if (viewport.id === "desktop" && probe.overlappingNodePairs > 0) {
    return `Looped transformers graph nodes overlapped in the ${viewport.label} viewport (${probe.overlappingNodePairs} pair(s)).`;
  }
  return null;
}

export async function verifyLoopedTransformersGraphViewports(
  bodyHtml: string,
  options: {
    launchBrowser?: () => Promise<Browser>;
    viewports?: readonly RenderedQualityViewport[];
  } = {},
): Promise<string | null> {
  const viewports = options.viewports ?? RENDERED_QUALITY_VIEWPORTS;
  for (const viewport of viewports) {
    const probe = await probeLoopedTransformersGraphAtViewport(
      bodyHtml,
      {
        width: viewport.width,
        height: viewport.height,
      },
      options,
    );
    const failure = formatLoopedTransformersViewportProbeFailure(
      viewport,
      probe,
    );
    if (failure) {
      return failure;
    }
  }
  return null;
}
