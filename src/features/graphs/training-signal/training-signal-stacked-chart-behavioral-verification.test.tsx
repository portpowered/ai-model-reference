import { afterEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { cleanup, render } from "@testing-library/react";
import { DEFAULT_TRAINING_SIGNAL_CHART_INPUT } from "@/features/graphs/training-signal/default-training-signal-timeline";
import { TrainingSignalStackedChart } from "@/features/graphs/training-signal/TrainingSignalStackedChart";
import {
  TRAINING_SIGNAL_BAND_KEYS,
  TRAINING_SIGNAL_BAND_LABELS,
} from "@/features/graphs/training-signal/training-signal-band-keys";
import { TRAINING_SIGNAL_BAND_COLORS } from "@/features/graphs/training-signal/training-signal-chart-tokens";
import {
  closePlaywrightBrowserWithTimeout,
  launchPlaywrightBrowser,
} from "@/lib/verify/launch-playwright-browser";
import {
  acquireVerifyServerSession,
  shouldRunVerifyProductionIntegrationTests,
} from "@/lib/verify/server-lifecycle";

const repoRoot = join(import.meta.dir, "../../../..");

const RESPONSIVE_CONTAINER_WIDTHS = [
  { label: "narrow", width: "20rem" },
  { label: "wide", width: "48rem" },
] as const;

const BLOG_VIEWPORTS = [
  { label: "mobile", width: 390, height: 844 },
  { label: "desktop", width: 1280, height: 800 },
] as const;

const BLOG_ROUTE = "/blog/llm-training-shift";

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

function assertChartBehavioralSurface(
  container: HTMLElement,
  options?: { dataTestId?: string },
) {
  const dataTestId = options?.dataTestId ?? "training-signal-stacked-chart";

  expect(container.textContent).toContain("LLM training-signal shift chart");
  expect(container.textContent).toContain("Time");
  expect(container.textContent).toContain("Relative signal mix (illustrative)");

  const legend = container.querySelector(`[data-graph-legend="${dataTestId}"]`);
  expect(legend).toBeTruthy();
  expect(legend?.className).toContain("flex-wrap");

  const legendItems = legend?.querySelectorAll("li") ?? [];
  expect(legendItems.length).toBe(6);
  for (const bandKey of TRAINING_SIGNAL_BAND_KEYS) {
    expect(container.textContent).toContain(
      TRAINING_SIGNAL_BAND_LABELS[bandKey],
    );
  }

  expect(
    container.querySelector('[data-training-signal-chart-surface="ready"]'),
  ).toBeTruthy();
  expect(container.querySelectorAll(".recharts-area-area").length).toBe(6);

  const figure = container.querySelector(`[data-testid="${dataTestId}"]`);
  expect(figure?.getAttribute("aria-labelledby")).toBe(`${dataTestId}-title`);
  expect(figure?.getAttribute("aria-describedby")).toContain(
    `${dataTestId}-description`,
  );
}

describe("training signal stacked chart behavioral verification (005)", () => {
  afterEach(() => {
    cleanup();
  });

  test("legend includes all six required training-signal labels", () => {
    const { container } = render(
      <TrainingSignalStackedChart
        chartInput={DEFAULT_TRAINING_SIGNAL_CHART_INPUT}
      />,
    );

    const legend = container.querySelector(
      '[data-graph-legend="training-signal-stacked-chart"]',
    );
    const legendText = legend?.textContent ?? "";

    for (const bandKey of TRAINING_SIGNAL_BAND_KEYS) {
      expect(legendText).toContain(TRAINING_SIGNAL_BAND_LABELS[bandKey]);
    }
  });

  test("axis labels render with expected reader-facing wording", () => {
    const { container } = render(
      <TrainingSignalStackedChart
        chartInput={DEFAULT_TRAINING_SIGNAL_CHART_INPUT}
      />,
    );

    expect(container.textContent).toContain("Time");
    expect(container.textContent).toContain(
      "Relative signal mix (illustrative)",
    );
  });

  test("exposes accessible chart name and description", () => {
    const { container } = render(
      <TrainingSignalStackedChart
        chartInput={DEFAULT_TRAINING_SIGNAL_CHART_INPUT}
        dataTestId="training-signal-behavioral"
      />,
    );

    const figure = container.querySelector(
      '[data-testid="training-signal-behavioral"]',
    );
    expect(figure?.getAttribute("aria-labelledby")).toBe(
      "training-signal-behavioral-title",
    );

    const description = container.querySelector(
      "#training-signal-behavioral-description",
    );
    expect(description?.textContent).toContain("Conceptual stacked bands");
    expect(description?.textContent).toContain("illustrative");
  });

  test("maps each band to a stable chart token across rerenders", () => {
    const { container, rerender } = render(
      <TrainingSignalStackedChart
        chartInput={DEFAULT_TRAINING_SIGNAL_CHART_INPUT}
      />,
    );

    const readTokenStyles = () =>
      container.querySelector('[data-slot="chart"]')?.getAttribute("style") ??
      "";

    const initialStyles = readTokenStyles();
    for (const bandKey of TRAINING_SIGNAL_BAND_KEYS) {
      expect(initialStyles).toContain(
        `--color-${bandKey}: ${TRAINING_SIGNAL_BAND_COLORS[bandKey]}`,
      );
    }

    rerender(
      <TrainingSignalStackedChart
        chartInput={DEFAULT_TRAINING_SIGNAL_CHART_INPUT}
      />,
    );

    expect(readTokenStyles()).toBe(initialStyles);
  });

  test.each(
    RESPONSIVE_CONTAINER_WIDTHS.map(
      (viewport) => [viewport.label, viewport.width] as const,
    ),
  )("keeps title, legend, axes, and chart surface present at %s blog width", (_label, width) => {
    const { container } = render(
      <div style={{ maxWidth: width, width: "100%" }}>
        <TrainingSignalStackedChart
          chartInput={DEFAULT_TRAINING_SIGNAL_CHART_INPUT}
        />
      </div>,
    );

    assertChartBehavioralSurface(container);
  });

  test.each(
    BLOG_VIEWPORTS.map((viewport) => [viewport.label, viewport] as const),
  )(
    "served blog route keeps chart regions ordered without overlap at %s width",
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
        await page.goto(`${session.baseUrl}${BLOG_ROUTE}`, {
          waitUntil: "load",
        });

        const chart = page.locator('[data-training-signal-chart="ready"]');
        await chart.waitFor({ state: "visible" });

        const layout = await page.evaluate(() => {
          const pageClientWidth = document.documentElement.clientWidth;
          const pageScrollWidth = document.documentElement.scrollWidth;

          const figure = document.querySelector(
            '[data-training-signal-chart="ready"]',
          );
          if (!figure) {
            throw new Error("missing training-signal chart figure");
          }

          const status = figure.querySelector(
            '[data-training-signal-status="true"]',
          );
          const title = figure.querySelector(
            "#training-signal-stacked-chart-title",
          );
          const plot = figure.querySelector(".recharts-responsive-container");
          const legend = figure.querySelector(
            '[data-graph-legend="training-signal-stacked-chart"]',
          );
          const xAxisLabel = Array.from(
            figure.querySelectorAll("span.uppercase"),
          ).find((node) => node.textContent?.trim() === "Time");
          const yAxisLabel = Array.from(
            figure.querySelectorAll("span.uppercase"),
          ).find((node) =>
            node.textContent?.trim().includes("Relative signal mix"),
          );

          function readRect(element: Element | null, name: string): LayoutRect {
            if (!element) {
              throw new Error(`missing chart region ${name}`);
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

          const statusRect = readRect(status, "status");
          const titleRect = readRect(title, "title");
          const plotRect = readRect(plot, "plot");
          const legendRect = readRect(legend, "legend");
          const xAxisRect = readRect(xAxisLabel ?? null, "x-axis");
          const yAxisRect = readRect(yAxisLabel ?? null, "y-axis");
          const legendItems = Array.from(
            legend?.querySelectorAll("li") ?? [],
          ).map((node, index) => readRect(node, `legend-item-${index}`));

          return {
            page: {
              clientWidth: pageClientWidth,
              scrollWidth: pageScrollWidth,
            },
            figure: {
              clientWidth: figure.clientWidth,
              scrollWidth: figure.scrollWidth,
            },
            statusRect,
            titleRect,
            plotRect,
            legendRect,
            xAxisRect,
            yAxisRect,
            legendItems,
          };
        });

        expect(layout.page.scrollWidth).toBeLessThanOrEqual(
          layout.page.clientWidth + 1,
        );
        expect(layout.figure.scrollWidth).toBeLessThanOrEqual(
          layout.figure.clientWidth + 1,
        );
        expect(layout.statusRect.height).toBeGreaterThan(0);
        expect(layout.titleRect.height).toBeGreaterThan(0);
        expect(layout.plotRect.height).toBeGreaterThan(0);
        expect(layout.legendRect.height).toBeGreaterThan(0);
        expect(layout.xAxisRect.height).toBeGreaterThan(0);
        expect(layout.yAxisRect.height).toBeGreaterThan(0);

        expect(layout.statusRect.bottom).toBeLessThanOrEqual(
          layout.titleRect.top + 4,
        );
        expect(layout.titleRect.bottom).toBeLessThanOrEqual(
          layout.plotRect.top + 4,
        );
        expect(layout.plotRect.bottom).toBeLessThanOrEqual(
          layout.legendRect.top + 4,
        );

        for (let index = 0; index < layout.legendItems.length; index += 1) {
          for (
            let other = index + 1;
            other < layout.legendItems.length;
            other += 1
          ) {
            expect(
              rectsOverlap(
                layout.legendItems[index],
                layout.legendItems[other],
              ),
            ).toBe(false);
          }
        }

        expect(rectsOverlap(layout.xAxisRect, layout.legendRect)).toBe(false);
        expect(rectsOverlap(layout.yAxisRect, layout.legendRect)).toBe(false);

        await page.close();
      } finally {
        await closePlaywrightBrowserWithTimeout(browser);
        await session.cleanup();
      }
    },
    120_000,
  );
});
