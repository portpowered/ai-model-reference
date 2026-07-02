import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { DEFAULT_TRAINING_SIGNAL_CHART_INPUT } from "@/features/graphs/training-signal/default-training-signal-timeline";
import { TrainingSignalStackedChart } from "@/features/graphs/training-signal/TrainingSignalStackedChart";
import {
  TRAINING_SIGNAL_BAND_KEYS,
  TRAINING_SIGNAL_BAND_LABELS,
} from "@/features/graphs/training-signal/training-signal-band-keys";
import { TRAINING_SIGNAL_BAND_COLORS } from "@/features/graphs/training-signal/training-signal-chart-tokens";

describe("TrainingSignalStackedChart", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders visible conceptual labeling for the default dataset", () => {
    const { container } = render(
      <TrainingSignalStackedChart
        chartInput={DEFAULT_TRAINING_SIGNAL_CHART_INPUT}
      />,
    );

    expect(
      container.querySelector('[data-training-signal-chart="ready"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-value-mode="conceptual"]'),
    ).toBeTruthy();
    expect(container.textContent).toContain("Conceptual illustration");
    expect(container.textContent).not.toContain("measured data from");
  });

  test("renders source-aware quantitative status text when metadata supplies a source", () => {
    const { container } = render(
      <TrainingSignalStackedChart
        chartInput={{
          ...DEFAULT_TRAINING_SIGNAL_CHART_INPUT,
          metadata: {
            valueMode: "quantitative",
            quantitativeSource: "Example Lab 2025 training-mix report",
          },
        }}
      />,
    );

    expect(
      container.querySelector('[data-value-mode="quantitative"]'),
    ).toBeTruthy();
    expect(container.textContent).toContain(
      "Quantitative values from Example Lab 2025 training-mix report",
    );
  });

  test("renders an accessible empty state for missing timeline data", () => {
    const { container } = render(
      <TrainingSignalStackedChart chartInput={{ timeline: [] }} />,
    );

    expect(
      container.querySelector('[data-training-signal-chart="empty"]'),
    ).toBeTruthy();
    expect(container.textContent).toContain(
      "Training-signal chart unavailable",
    );
  });

  test("renders an accessible error state for incomplete chart data", () => {
    const { container } = render(
      <TrainingSignalStackedChart
        chartInput={{
          timeline: [
            {
              timeKey: "era-1",
              timeLabel: "Early era",
              pretrainingCorpus: 90,
            },
          ],
        }}
      />,
    );

    expect(
      container.querySelector('[data-training-signal-chart="error"]'),
    ).toBeTruthy();
    expect(container.textContent).toContain(
      "Training-signal chart data is incomplete",
    );
  });

  test("renders a stacked chart surface with title, axes, legend, and all six bands", () => {
    const { container } = render(
      <TrainingSignalStackedChart
        chartInput={DEFAULT_TRAINING_SIGNAL_CHART_INPUT}
      />,
    );

    expect(
      container.querySelector('[data-training-signal-chart-surface="ready"]'),
    ).toBeTruthy();
    expect(container.textContent).toContain("LLM training-signal shift chart");
    expect(container.textContent).toContain("Time");
    expect(container.textContent).toContain(
      "Relative signal mix (illustrative)",
    );
    expect(container.querySelectorAll(".recharts-area-area").length).toBe(6);
    expect(
      container.querySelector(
        '[data-graph-legend="training-signal-stacked-chart"]',
      ),
    ).toBeTruthy();

    for (const bandKey of TRAINING_SIGNAL_BAND_KEYS) {
      expect(container.textContent).toContain(
        TRAINING_SIGNAL_BAND_LABELS[bandKey],
      );
      expect(
        container.querySelector(`.training-signal-area--${bandKey}`),
      ).toBeTruthy();
    }
  });

  test("maps each training-signal band to a stable chart token in legend order", () => {
    const { container, rerender } = render(
      <TrainingSignalStackedChart
        chartInput={DEFAULT_TRAINING_SIGNAL_CHART_INPUT}
      />,
    );

    const chartContainer = container.querySelector('[data-slot="chart"]');
    expect(chartContainer).toBeTruthy();

    for (const bandKey of TRAINING_SIGNAL_BAND_KEYS) {
      const chartStyle = chartContainer?.getAttribute("style") ?? "";
      expect(chartStyle).toContain(
        `--color-${bandKey}: ${TRAINING_SIGNAL_BAND_COLORS[bandKey]}`,
      );
      expect(
        container.querySelector(`.training-signal-area--${bandKey}`),
      ).toBeTruthy();
    }

    const legendText =
      container.querySelector(
        '[data-graph-legend="training-signal-stacked-chart"]',
      )?.textContent ?? "";

    rerender(
      <TrainingSignalStackedChart
        chartInput={DEFAULT_TRAINING_SIGNAL_CHART_INPUT}
      />,
    );

    const rerenderedLegendText =
      container.querySelector(
        '[data-graph-legend="training-signal-stacked-chart"]',
      )?.textContent ?? "";

    expect(rerenderedLegendText).toBe(legendText);
    for (const bandKey of TRAINING_SIGNAL_BAND_KEYS) {
      expect(
        container.querySelector(`.training-signal-area--${bandKey}`),
      ).toBeTruthy();
    }
  });
});
