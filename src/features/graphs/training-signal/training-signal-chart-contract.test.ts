import { describe, expect, test } from "bun:test";
import { DEFAULT_TRAINING_SIGNAL_CHART_INPUT } from "@/features/graphs/training-signal/default-training-signal-timeline";
import { TRAINING_SIGNAL_BAND_KEYS } from "@/features/graphs/training-signal/training-signal-band-keys";
import {
  formatTrainingSignalValue,
  resolveTrainingSignalChart,
} from "@/features/graphs/training-signal/training-signal-chart-contract";

describe("resolveTrainingSignalChart", () => {
  test("accepts all six required band keys on each timeline point", () => {
    const resolution = resolveTrainingSignalChart(
      DEFAULT_TRAINING_SIGNAL_CHART_INPUT,
    );

    expect(resolution.status).toBe("ready");
    if (resolution.status !== "ready") {
      return;
    }

    for (const point of resolution.chart.timeline) {
      for (const bandKey of TRAINING_SIGNAL_BAND_KEYS) {
        expect(typeof point[bandKey]).toBe("number");
      }
    }
  });

  test("defaults to conceptual labeling when quantitative metadata is absent", () => {
    const resolution = resolveTrainingSignalChart(
      DEFAULT_TRAINING_SIGNAL_CHART_INPUT,
    );

    expect(resolution.status).toBe("ready");
    if (resolution.status !== "ready") {
      return;
    }

    expect(resolution.chart.metadata.valueMode).toBe("conceptual");
    expect(resolution.chart.labeling.statusText).toContain("Conceptual");
    expect(resolution.chart.labeling.yAxisLabel).toContain("illustrative");
    expect(resolution.chart.labeling.statusText).not.toContain("%");
    expect(resolution.chart.labeling.accessibleDescription).toContain(
      "illustrative",
    );
  });

  test("supports sourced quantitative metadata with source-aware wording", () => {
    const resolution = resolveTrainingSignalChart({
      ...DEFAULT_TRAINING_SIGNAL_CHART_INPUT,
      metadata: {
        valueMode: "quantitative",
        quantitativeSource: "Example Lab 2025 training-mix report",
      },
    });

    expect(resolution.status).toBe("ready");
    if (resolution.status !== "ready") {
      return;
    }

    expect(resolution.chart.labeling.statusText).toContain(
      "Example Lab 2025 training-mix report",
    );
    expect(resolution.chart.labeling.yAxisLabel).toBe("Relative signal mix");
    expect(formatTrainingSignalValue(42, "quantitative")).toBe("42%");
  });

  test("returns an error state for quantitative metadata without a source label", () => {
    const resolution = resolveTrainingSignalChart({
      ...DEFAULT_TRAINING_SIGNAL_CHART_INPUT,
      metadata: {
        valueMode: "quantitative",
      },
    });

    expect(resolution.status).toBe("error");
    if (resolution.status !== "error") {
      return;
    }

    expect(resolution.issues.join(" ")).toContain("quantitativeSource");
  });

  test("returns an empty state instead of throwing for missing timeline points", () => {
    const resolution = resolveTrainingSignalChart({
      timeline: [],
    });

    expect(resolution.status).toBe("empty");
  });

  test("returns an error state for incomplete band values", () => {
    const resolution = resolveTrainingSignalChart({
      timeline: [
        {
          timeKey: "era-1",
          timeLabel: "Early era",
          pretrainingCorpus: 90,
          instructionSupervised: 10,
        },
      ],
    });

    expect(resolution.status).toBe("error");
    if (resolution.status !== "error") {
      return;
    }

    expect(resolution.issues.length).toBeGreaterThan(0);
    expect(resolution.issues.join(" ")).toContain("preferenceSignal");
  });
});

describe("formatTrainingSignalValue", () => {
  test("does not describe conceptual values as measured percentages", () => {
    expect(formatTrainingSignalValue(42, "conceptual")).toBe(
      "42 (illustrative)",
    );
    expect(formatTrainingSignalValue(42, "conceptual")).not.toContain("%");
  });
});
