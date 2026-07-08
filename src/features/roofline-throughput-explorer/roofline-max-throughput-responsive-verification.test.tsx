import { afterEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { chromium } from "playwright";
import {
  blogPostHref,
  loadBlogPostFromDisk,
} from "@/lib/content/blog-page-load";
import { renderBlogPostShell } from "@/lib/content/blog-shell-render";
import type { RooflineModelSizePreset } from "@/lib/content/roofline-model-size-presets";
import { shouldRunPlaywrightHttpVerifierUnitTests } from "@/lib/verify/export-integration-probe-lock";
import {
  closePlaywrightBrowserWithTimeout,
  launchPlaywrightBrowser,
  resolvePlaywrightChromiumExecutablePath,
} from "@/lib/verify/launch-playwright-browser";
import { verifyRooflineThroughputExplorerViewports } from "@/lib/verify/roofline-throughput-explorer-viewport-http";
import {
  acquireVerifyServerSession,
  shouldRunVerifyProductionIntegrationTests,
} from "@/lib/verify/server-lifecycle";
import { RooflineThroughputExplorer } from "./RooflineThroughputExplorer";
import { RooflineThroughputExplorerFromRegistry } from "./RooflineThroughputExplorerFromRegistry";
import {
  ROOFLINE_THROUGHPUT_ACTIVE_SCENARIO_LEGEND_LABEL,
  ROOFLINE_THROUGHPUT_BOUNDARY_LEGEND_LABEL,
  ROOFLINE_THROUGHPUT_EXPLORER_AXIS_X,
  ROOFLINE_THROUGHPUT_EXPLORER_AXIS_Y,
  ROOFLINE_THROUGHPUT_EXPLORER_CHART_LABEL,
} from "./roofline-throughput-chart";
import {
  ROOFLINE_ACTIVE_WEIGHT_SIZE_CONTROL_LABEL,
  ROOFLINE_BYTES_PER_PARAMETER_CONTROL_LABEL,
} from "./roofline-throughput-explorer-controls";
import {
  ROOFLINE_EMPTY_PRESETS_MESSAGE,
  ROOFLINE_MODEL_PRESET_CONTROL_LABEL,
} from "./roofline-throughput-explorer-presets";

const repoRoot = join(import.meta.dir, "../../..");
const BLOG_SLUG = "roofline-max-throughput";
const BLOG_ROUTE = "/blog/roofline-max-throughput";
const ROOFLINE_VIEWPORT_PROBE_TIMEOUT_MS = 120_000;

const BLOG_VIEWPORTS = [
  { label: "mobile", width: 390, height: 844 },
  { label: "desktop", width: 1280, height: 800 },
] as const;

function canLaunchPlaywrightChromium(): boolean {
  const executablePath = resolvePlaywrightChromiumExecutablePath();
  if (executablePath) {
    return existsSync(executablePath);
  }

  try {
    return existsSync(chromium.executablePath());
  } catch {
    return false;
  }
}

const PRESETS_WITH_MISSING_SIZE = [
  {
    modelId: "model.glm-5-2",
    label: "GLM-5.2",
    effectiveSizeBillions: 40,
  },
  {
    modelId: "model.qwen3-0-6b",
    label: "Qwen3-0.6B",
    effectiveSizeBillions: null,
  },
] satisfies RooflineModelSizePreset[];

type LayoutRect = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

function rectsOverlap(a: LayoutRect, b: LayoutRect): boolean {
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  );
}

function assertExplorerBehavioralSurface(container: HTMLElement) {
  expect(container.textContent).toContain(
    ROOFLINE_THROUGHPUT_EXPLORER_CHART_LABEL,
  );
  expect(container.textContent).toContain(ROOFLINE_THROUGHPUT_EXPLORER_AXIS_X);
  expect(container.textContent).toContain(ROOFLINE_THROUGHPUT_EXPLORER_AXIS_Y);
  expect(container.textContent).toContain(
    ROOFLINE_THROUGHPUT_BOUNDARY_LEGEND_LABEL,
  );
  expect(container.textContent).toContain(
    ROOFLINE_THROUGHPUT_ACTIVE_SCENARIO_LEGEND_LABEL,
  );

  expect(
    container.querySelector(
      '[data-graph-legend="roofline-throughput-explorer"]',
    ),
  ).toBeTruthy();
  expect(
    container.querySelector('[data-roofline-throughput-explorer="chart"]'),
  ).toBeTruthy();
  expect(
    container
      .querySelector("[data-active-weight-size-billions]")
      ?.getAttribute("data-active-weight-size-billions"),
  ).toBeTruthy();
  expect(
    container
      .querySelector('[data-roofline-throughput-explorer="chart"]')
      ?.getAttribute("data-decode-tokens-per-second"),
  ).toBeTruthy();
  expect(container.querySelector(".recharts-line-curve")).toBeTruthy();
  expect(
    container.querySelector(".roofline-throughput-explorer__active-scenario"),
  ).toBeTruthy();
}

describe("roofline max throughput responsive verification (005)", () => {
  afterEach(() => {
    cleanup();
  });

  test("blog post shell exposes title, related docs, and explorer behavioral surface", async () => {
    const post = await loadBlogPostFromDisk(BLOG_SLUG);
    const html = renderBlogPostShell(post);

    expect(blogPostHref(BLOG_SLUG)).toBe(BLOG_ROUTE);
    expect(html).toContain(
      "Roofline maximum throughput: when bandwidth beats peak FLOPs",
    );
    expect(html).toContain('data-testid="blog-related-docs"');
    expect(html).toContain('data-roofline-throughput-explorer="explorer"');
    expect(html).toContain('data-testid="roofline-model-preset"');
    expect(html).toContain(ROOFLINE_THROUGHPUT_EXPLORER_CHART_LABEL);
    expect(html).toContain(ROOFLINE_THROUGHPUT_EXPLORER_AXIS_X);
    expect(html).toContain(ROOFLINE_THROUGHPUT_EXPLORER_AXIS_Y);
    expect(html).toContain(ROOFLINE_THROUGHPUT_BOUNDARY_LEGEND_LABEL);
    expect(html).toContain(ROOFLINE_THROUGHPUT_ACTIVE_SCENARIO_LEGEND_LABEL);
    expect(html).toContain('data-active-weight-size-billions="');
    expect(html).toContain('data-decode-tokens-per-second="');
  });

  test("registry-backed explorer keeps chart regions present at narrow and wide blog widths", () => {
    for (const width of ["20rem", "48rem"] as const) {
      const { container } = render(
        <div style={{ maxWidth: width, width: "100%" }}>
          <RooflineThroughputExplorerFromRegistry />
        </div>,
      );

      assertExplorerBehavioralSurface(container);
    }
  });

  test("keyboard tab order reaches preset, active weight, and bytes-per-parameter controls with focus-visible styling", async () => {
    const user = userEvent.setup();
    const { container } = render(<RooflineThroughputExplorerFromRegistry />);

    const presetControl = screen.getByTestId("roofline-model-preset");
    const activeWeightControl = screen.getByTestId(
      "roofline-active-weight-size",
    );
    const bytesControl = screen.getByTestId("roofline-bytes-per-parameter");

    expect(screen.getByLabelText(ROOFLINE_MODEL_PRESET_CONTROL_LABEL)).toBe(
      presetControl,
    );
    expect(
      screen.getByLabelText(ROOFLINE_ACTIVE_WEIGHT_SIZE_CONTROL_LABEL),
    ).toBe(activeWeightControl);
    expect(
      screen.getByLabelText(ROOFLINE_BYTES_PER_PARAMETER_CONTROL_LABEL),
    ).toBe(bytesControl);

    presetControl.focus();
    expect(document.activeElement).toBe(presetControl);

    await user.tab();
    expect(document.activeElement).toBe(activeWeightControl);

    await user.tab();
    expect(document.activeElement).toBe(bytesControl);

    expect(container.innerHTML).toContain("focus-visible:ring-3");
    expect(container.innerHTML).toContain("focus-visible:border-ring");
  });

  test("presets with missing effective sizes keep the chart usable and show the selected model label", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <RooflineThroughputExplorer
        presets={PRESETS_WITH_MISSING_SIZE}
        bytesPerParameter={2}
        memoryBandwidthGbps={1000}
      />,
    );

    await user.selectOptions(
      screen.getByTestId("roofline-model-preset"),
      "model.qwen3-0-6b",
    );

    expect(
      container
        .querySelector("[data-selected-model-label]")
        ?.getAttribute("data-selected-model-label"),
    ).toBe("Qwen3-0.6B");
    expect(
      container.querySelector('[data-roofline-throughput-explorer="chart"]'),
    ).toBeTruthy();
    expect(container.querySelector(".recharts-line-curve")).toBeTruthy();
    expect(
      container
        .querySelector("[data-active-weight-size-billions]")
        ?.getAttribute("data-active-weight-size-billions"),
    ).toBeTruthy();
  });

  test("all-null preset lists still render custom controls and a working chart with fallback weight", () => {
    const onlyMissingPresets = [
      {
        modelId: "model.qwen3-0-6b",
        label: "Qwen3-0.6B",
        effectiveSizeBillions: null,
      },
    ] satisfies RooflineModelSizePreset[];

    const { container } = render(
      <RooflineThroughputExplorer
        presets={onlyMissingPresets}
        bytesPerParameter={2}
        memoryBandwidthGbps={1000}
      />,
    );

    expect(screen.getByTestId("roofline-model-preset")).toBeTruthy();
    assertExplorerBehavioralSurface(container);
  });

  test("empty preset list renders an understandable unavailable state while keeping custom controls", () => {
    const { container } = render(
      <RooflineThroughputExplorer
        presets={[]}
        activeWeightSizeBillions={27}
        bytesPerParameter={2}
        memoryBandwidthGbps={1000}
      />,
    );

    expect(screen.getByText(ROOFLINE_EMPTY_PRESETS_MESSAGE)).toBeTruthy();
    expect(
      container.querySelector(
        '[data-roofline-throughput-explorer="empty-presets"]',
      ),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(ROOFLINE_ACTIVE_WEIGHT_SIZE_CONTROL_LABEL),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(ROOFLINE_BYTES_PER_PARAMETER_CONTROL_LABEL),
    ).toBeTruthy();
    assertExplorerBehavioralSurface(container);
  });

  test(
    "blog post explorer markup keeps desktop and mobile control regions visible and non-overlapping",
    async () => {
      if (
        !shouldRunPlaywrightHttpVerifierUnitTests() ||
        !canLaunchPlaywrightChromium()
      ) {
        return;
      }

      const post = await loadBlogPostFromDisk(BLOG_SLUG);
      const html = renderBlogPostShell(post);
      const failure = await verifyRooflineThroughputExplorerViewports(html);

      expect(failure).toBeNull();
    },
    { timeout: ROOFLINE_VIEWPORT_PROBE_TIMEOUT_MS },
  );

  test.each(
    BLOG_VIEWPORTS.map((viewport) => [viewport.label, viewport] as const),
  )(
    "served blog route keeps explorer regions ordered without overlap at %s width",
    async (_label, viewport) => {
      if (
        !shouldRunVerifyProductionIntegrationTests(repoRoot) ||
        !canLaunchPlaywrightChromium()
      ) {
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
        await page.goto(`${session.baseUrl}${BLOG_ROUTE}`, {
          waitUntil: "load",
        });

        const explorer = page.locator(
          '[data-roofline-throughput-explorer="explorer"]',
        );
        await explorer.waitFor({ state: "visible" });

        const layout = await page.evaluate(() => {
          const pageClientWidth = document.documentElement.clientWidth;
          const pageScrollWidth = document.documentElement.scrollWidth;

          const explorerRoot = document.querySelector(
            '[data-roofline-throughput-explorer="explorer"]',
          );
          if (!explorerRoot) {
            throw new Error("missing roofline explorer root");
          }

          const title = document.querySelector("article h1");
          const relatedDocs = document.querySelector(
            '[data-testid="blog-related-docs"]',
          );
          const preset = document.querySelector(
            '[data-testid="roofline-model-preset"]',
          );
          const activeWeight = document.querySelector(
            '[data-testid="roofline-active-weight-size"]',
          );
          const bytesControl = document.querySelector(
            '[data-testid="roofline-bytes-per-parameter"]',
          );
          const chart = document.querySelector(
            '[data-roofline-throughput-explorer="chart"]',
          );
          const chartTitle = Array.from(
            explorerRoot.querySelectorAll("div"),
          ).find((node) =>
            node.textContent?.includes("Roofline Throughput Explorer"),
          );
          const legend = document.querySelector(
            '[data-graph-legend="roofline-throughput-explorer"]',
          );
          const activeWeightSummary = document.querySelector(
            "[data-active-weight-size-billions]",
          );

          function readRect(element: Element | null, name: string): LayoutRect {
            if (!element) {
              throw new Error(`missing explorer region ${name}`);
            }
            const rect = element.getBoundingClientRect();
            return {
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            };
          }

          const presetRect = readRect(preset, "preset");
          const activeWeightRect = readRect(activeWeight, "active-weight");
          const bytesRect = readRect(bytesControl, "bytes-per-parameter");
          const chartRect = readRect(chart, "chart");
          const legendRect = readRect(legend, "legend");
          const titleRect = readRect(title, "title");
          const relatedDocsRect = readRect(relatedDocs, "related-docs");
          const activeWeightSummaryRect = readRect(
            activeWeightSummary,
            "active-weight-summary",
          );

          return {
            page: {
              clientWidth: pageClientWidth,
              scrollWidth: pageScrollWidth,
            },
            titleRect,
            relatedDocsRect,
            presetRect,
            activeWeightRect,
            bytesRect,
            chartRect,
            chartTitleRect: chartTitle
              ? readRect(chartTitle, "chart-title")
              : null,
            legendRect,
            activeWeightSummaryRect,
          };
        });

        expect(layout.page.scrollWidth).toBeLessThanOrEqual(
          layout.page.clientWidth + 1,
        );
        expect(layout.titleRect.height).toBeGreaterThan(0);
        expect(layout.relatedDocsRect.height).toBeGreaterThan(0);
        expect(layout.presetRect.height).toBeGreaterThan(0);
        expect(layout.activeWeightRect.height).toBeGreaterThan(0);
        expect(layout.bytesRect.height).toBeGreaterThan(0);
        expect(layout.chartRect.height).toBeGreaterThan(0);
        expect(layout.legendRect.height).toBeGreaterThan(0);
        expect(layout.activeWeightSummaryRect.height).toBeGreaterThan(0);
        expect(layout.chartTitleRect?.height ?? 0).toBeGreaterThan(0);

        expect(layout.presetRect.bottom).toBeLessThanOrEqual(
          layout.chartRect.top + 8,
        );
        expect(layout.chartRect.bottom).toBeLessThanOrEqual(
          layout.legendRect.top + 8,
        );
        expect(rectsOverlap(layout.presetRect, layout.bytesRect)).toBe(false);
        expect(rectsOverlap(layout.activeWeightRect, layout.legendRect)).toBe(
          false,
        );

        await page.close();
      } finally {
        await closePlaywrightBrowserWithTimeout(browser);
        await session.cleanup();
      }
    },
    ROOFLINE_VIEWPORT_PROBE_TIMEOUT_MS,
  );
});
