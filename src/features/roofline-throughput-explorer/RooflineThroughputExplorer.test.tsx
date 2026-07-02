import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RooflineModelSizePreset } from "@/lib/content/roofline-model-size-presets";
import { RooflineThroughputExplorer } from "./RooflineThroughputExplorer";
import {
  ROOFLINE_THROUGHPUT_ACTIVE_SCENARIO_LEGEND_LABEL,
  ROOFLINE_THROUGHPUT_BOUNDARY_LEGEND_LABEL,
  ROOFLINE_THROUGHPUT_EXPLORER_AXIS_X,
  ROOFLINE_THROUGHPUT_EXPLORER_AXIS_Y,
  ROOFLINE_THROUGHPUT_EXPLORER_CHART_LABEL,
} from "./roofline-throughput-chart";
import {
  ROOFLINE_EMPTY_PRESETS_MESSAGE,
  ROOFLINE_MODEL_PRESET_CONTROL_LABEL,
} from "./roofline-throughput-explorer-presets";

const DEFAULT_SCENARIO = {
  activeWeightSizeBillions: 27,
  bytesPerParameter: 2,
  memoryBandwidthGbps: 1000,
} as const;

const TEST_PRESETS = [
  {
    modelId: "model.glm-5-2",
    label: "GLM-5.2",
    effectiveSizeBillions: 40,
  },
  {
    modelId: "model.qwen-3-6-27b",
    label: "Qwen3.6-27B",
    effectiveSizeBillions: 27,
  },
] satisfies RooflineModelSizePreset[];

describe("RooflineThroughputExplorer", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders chart title, axis labels, legend, boundary line, and active scenario marker", () => {
    const { container } = render(
      <RooflineThroughputExplorer {...DEFAULT_SCENARIO} />,
    );

    expect(
      screen.getByText(ROOFLINE_THROUGHPUT_EXPLORER_CHART_LABEL),
    ).toBeTruthy();
    expect(screen.getByText(ROOFLINE_THROUGHPUT_EXPLORER_AXIS_X)).toBeTruthy();
    expect(screen.getByText(ROOFLINE_THROUGHPUT_EXPLORER_AXIS_Y)).toBeTruthy();
    expect(
      screen.getByText(ROOFLINE_THROUGHPUT_BOUNDARY_LEGEND_LABEL),
    ).toBeTruthy();
    expect(
      screen.getByText(ROOFLINE_THROUGHPUT_ACTIVE_SCENARIO_LEGEND_LABEL),
    ).toBeTruthy();
    expect(
      container.querySelector(
        '[data-graph-legend="roofline-throughput-explorer"]',
      ),
    ).toBeTruthy();
    expect(container.querySelector(".recharts-line-curve")).toBeTruthy();
    expect(
      container.querySelector(".roofline-throughput-explorer__active-scenario"),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-roofline-throughput-explorer="chart"]'),
    ).toBeTruthy();
  });

  test("recomputes chart state when scenario inputs change", () => {
    const { container, rerender } = render(
      <RooflineThroughputExplorer {...DEFAULT_SCENARIO} />,
    );

    const initialBoundaryPath = container
      .querySelector(".recharts-line-curve")
      ?.getAttribute("d");
    expect(initialBoundaryPath).toBeTruthy();

    rerender(
      <RooflineThroughputExplorer
        {...DEFAULT_SCENARIO}
        bytesPerParameter={8}
      />,
    );

    const updatedBoundaryPath = container
      .querySelector(".recharts-line-curve")
      ?.getAttribute("d");
    expect(updatedBoundaryPath).toBeTruthy();
    expect(updatedBoundaryPath).not.toBe(initialBoundaryPath);
    expect(
      container.querySelector(".roofline-throughput-explorer__active-scenario"),
    ).toBeTruthy();
  });

  test("renders an accessible invalid state instead of a broken chart", () => {
    render(
      <RooflineThroughputExplorer
        activeWeightSizeBillions={27}
        bytesPerParameter={2}
        memoryBandwidthGbps={0}
      />,
    );

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(
      screen.getByText("Roofline scenario inputs are incomplete or invalid."),
    ).toBeTruthy();
  });

  test("populates the preset dropdown from props and initializes the active scenario", () => {
    const { container } = render(
      <RooflineThroughputExplorer
        presets={TEST_PRESETS}
        bytesPerParameter={2}
        memoryBandwidthGbps={1000}
      />,
    );

    const presetControl = screen.getByLabelText(
      ROOFLINE_MODEL_PRESET_CONTROL_LABEL,
    ) as HTMLSelectElement;

    expect(presetControl).toBeTruthy();
    expect(presetControl.value).toBe("model.glm-5-2");
    expect(
      container
        .querySelector("[data-active-weight-size-billions]")
        ?.getAttribute("data-active-weight-size-billions"),
    ).toBe("40");
    expect(
      container
        .querySelector("[data-selected-model-label]")
        ?.getAttribute("data-selected-model-label"),
    ).toBe("GLM-5.2");
    expect(
      screen.getByText(ROOFLINE_THROUGHPUT_EXPLORER_CHART_LABEL),
    ).toBeTruthy();
  });

  test("updates the active scenario when a different preset is selected", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <RooflineThroughputExplorer
        presets={TEST_PRESETS}
        bytesPerParameter={2}
        memoryBandwidthGbps={1000}
        peakComputeFlopsPerSecond={5e12}
      />,
    );

    const activeWeightSummary = container.querySelector(
      "[data-active-weight-size-billions]",
    );
    expect(
      activeWeightSummary?.getAttribute("data-active-weight-size-billions"),
    ).toBe("40");

    await user.selectOptions(
      screen.getByTestId("roofline-model-preset"),
      "model.qwen-3-6-27b",
    );

    expect(
      activeWeightSummary?.getAttribute("data-active-weight-size-billions"),
    ).toBe("27");
    expect(activeWeightSummary?.getAttribute("data-selected-model-label")).toBe(
      "Qwen3.6-27B",
    );
    expect(
      container.querySelector(".roofline-throughput-explorer__active-scenario"),
    ).toBeTruthy();
  });

  test("renders an accessible empty preset state while still allowing explicit custom inputs", () => {
    render(<RooflineThroughputExplorer presets={[]} {...DEFAULT_SCENARIO} />);

    expect(screen.getByText(ROOFLINE_EMPTY_PRESETS_MESSAGE)).toBeTruthy();
    expect(
      screen.getByText(ROOFLINE_THROUGHPUT_EXPLORER_CHART_LABEL),
    ).toBeTruthy();
    expect(
      screen.queryByLabelText(ROOFLINE_MODEL_PRESET_CONTROL_LABEL),
    ).toBeNull();
  });
});
