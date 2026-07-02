import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { DEFAULT_TRAINING_SIGNAL_CHART_INPUT } from "@/features/graphs/training-signal/default-training-signal-timeline";
import { TrainingSignalStackedChart } from "@/features/graphs/training-signal/TrainingSignalStackedChart";

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
});
