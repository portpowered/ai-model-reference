import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
  ROOFLINE_ACTIVE_WEIGHT_SIZE_CONTROL_LABEL,
  ROOFLINE_BYTES_PER_PARAMETER_CONTROL_LABEL,
} from "./roofline-throughput-explorer-controls";
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

  test("recomputes chart state when bytes per parameter changes via controls", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <RooflineThroughputExplorer {...DEFAULT_SCENARIO} />,
    );

    const initialBoundaryPath = container
      .querySelector(".recharts-line-curve")
      ?.getAttribute("d");
    expect(initialBoundaryPath).toBeTruthy();

    const bytesControl = screen.getByTestId(
      "roofline-bytes-per-parameter",
    ) as HTMLInputElement;

    fireEvent.change(bytesControl, { target: { value: "8" } });

    const updatedBoundaryPath = container
      .querySelector(".recharts-line-curve")
      ?.getAttribute("d");
    expect(updatedBoundaryPath).toBeTruthy();
    expect(updatedBoundaryPath).not.toBe(initialBoundaryPath);
    expect(
      container.querySelector(".roofline-throughput-explorer__active-scenario"),
    ).toBeTruthy();
    expect(bytesControl.value).toBe("8");
    await user.tab();
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
      screen.getByLabelText(ROOFLINE_ACTIVE_WEIGHT_SIZE_CONTROL_LABEL),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(ROOFLINE_BYTES_PER_PARAMETER_CONTROL_LABEL),
    ).toBeTruthy();
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
    expect(
      container
        .querySelector("[data-selected-model-label]")
        ?.getAttribute("data-selected-model-label"),
    ).toBe("Qwen3.6-27B");
    expect(
      container.querySelector(".roofline-throughput-explorer__active-scenario"),
    ).toBeTruthy();
  });

  test("renders an accessible empty preset state while still allowing explicit custom inputs", () => {
    render(<RooflineThroughputExplorer presets={[]} {...DEFAULT_SCENARIO} />);

    expect(screen.getByText(ROOFLINE_EMPTY_PRESETS_MESSAGE)).toBeTruthy();
    expect(
      screen.getByLabelText(ROOFLINE_ACTIVE_WEIGHT_SIZE_CONTROL_LABEL),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(ROOFLINE_BYTES_PER_PARAMETER_CONTROL_LABEL),
    ).toBeTruthy();
    expect(
      screen.getByText(ROOFLINE_THROUGHPUT_EXPLORER_CHART_LABEL),
    ).toBeTruthy();
    expect(
      screen.queryByLabelText(ROOFLINE_MODEL_PRESET_CONTROL_LABEL),
    ).toBeNull();
  });

  test("updates the active scenario when the active weight slider moves", () => {
    const { container } = render(
      <RooflineThroughputExplorer
        presets={TEST_PRESETS}
        bytesPerParameter={2}
        memoryBandwidthGbps={1000}
        peakComputeFlopsPerSecond={5e12}
      />,
    );

    const slider = screen.getByTestId(
      "roofline-active-weight-size",
    ) as HTMLInputElement;
    const activeWeightOutput = container.querySelector(
      "[data-active-weight-size-billions]",
    );

    expect(
      activeWeightOutput?.getAttribute("data-active-weight-size-billions"),
    ).toBe("40");

    fireEvent.change(slider, { target: { value: "55" } });

    expect(
      activeWeightOutput?.getAttribute("data-active-weight-size-billions"),
    ).toBe("55");
    expect(
      container.querySelector(".roofline-throughput-explorer__active-scenario"),
    ).toBeTruthy();
  });

  test("updates the chart boundary when bytes per parameter changes", () => {
    const { container } = render(
      <RooflineThroughputExplorer {...DEFAULT_SCENARIO} />,
    );

    const initialBoundaryPath = container
      .querySelector(".recharts-line-curve")
      ?.getAttribute("d");
    expect(initialBoundaryPath).toBeTruthy();

    const bytesControl = screen.getByTestId(
      "roofline-bytes-per-parameter",
    ) as HTMLInputElement;

    fireEvent.change(bytesControl, { target: { value: "6" } });

    const updatedBoundaryPath = container
      .querySelector(".recharts-line-curve")
      ?.getAttribute("d");
    expect(updatedBoundaryPath).toBeTruthy();
    expect(updatedBoundaryPath).not.toBe(initialBoundaryPath);
    expect(bytesControl.value).toBe("6");
  });

  test("resyncs active weight from preset selection until the slider is edited", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <RooflineThroughputExplorer
        presets={TEST_PRESETS}
        bytesPerParameter={2}
        memoryBandwidthGbps={1000}
      />,
    );

    const activeWeightOutput = container.querySelector(
      "[data-active-weight-size-billions]",
    );
    const slider = screen.getByTestId(
      "roofline-active-weight-size",
    ) as HTMLInputElement;

    await user.selectOptions(
      screen.getByTestId("roofline-model-preset"),
      "model.qwen-3-6-27b",
    );
    expect(
      activeWeightOutput?.getAttribute("data-active-weight-size-billions"),
    ).toBe("27");

    fireEvent.change(slider, { target: { value: "33" } });
    expect(
      activeWeightOutput?.getAttribute("data-active-weight-size-billions"),
    ).toBe("33");

    await user.selectOptions(
      screen.getByTestId("roofline-model-preset"),
      "model.glm-5-2",
    );
    expect(
      activeWeightOutput?.getAttribute("data-active-weight-size-billions"),
    ).toBe("40");
  });

  test("enters custom override mode from the preset control and drives the chart from user inputs", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <RooflineThroughputExplorer
        presets={TEST_PRESETS}
        bytesPerParameter={2}
        memoryBandwidthGbps={1000}
        peakComputeFlopsPerSecond={5e12}
      />,
    );

    await user.selectOptions(
      screen.getByTestId("roofline-model-preset"),
      "__roofline_custom_override__",
    );

    expect(
      screen.getByText("Custom scenario values drive the chart."),
    ).toBeTruthy();
    expect(screen.queryByText(/Selected model:/)).toBeNull();

    const activeWeightControl = screen.getByTestId(
      "roofline-active-weight-size",
    ) as HTMLInputElement;
    expect(activeWeightControl.type).toBe("number");

    fireEvent.change(activeWeightControl, { target: { value: "120" } });
    expect(
      container
        .querySelector("[data-active-weight-size-billions]")
        ?.getAttribute("data-active-weight-size-billions"),
    ).toBe("120");
    expect(
      container.querySelector(".roofline-throughput-explorer__active-scenario"),
    ).toBeTruthy();
  });

  test("shows inline accessible errors for invalid custom values without updating the chart", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <RooflineThroughputExplorer
        presets={TEST_PRESETS}
        bytesPerParameter={2}
        memoryBandwidthGbps={1000}
      />,
    );

    const initialBoundaryPath = container
      .querySelector(".recharts-line-curve")
      ?.getAttribute("d");

    await user.selectOptions(
      screen.getByTestId("roofline-model-preset"),
      "__roofline_custom_override__",
    );

    const bytesControl = screen.getByTestId(
      "roofline-bytes-per-parameter",
    ) as HTMLInputElement;

    fireEvent.change(bytesControl, { target: { value: "" } });
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    expect(
      container.querySelector(".recharts-line-curve")?.getAttribute("d"),
    ).toBe(initialBoundaryPath);

    fireEvent.change(bytesControl, { target: { value: "4" } });
    expect(bytesControl.value).toBe("4");
    expect(
      container.querySelector(".recharts-line-curve")?.getAttribute("d"),
    ).not.toBe(initialBoundaryPath);
  });

  test("keeps control regions non-overlapping at representative mobile and desktop widths", () => {
    const { container } = render(
      <RooflineThroughputExplorer
        presets={TEST_PRESETS}
        bytesPerParameter={2}
        memoryBandwidthGbps={1000}
      />,
    );

    const explorer = container.querySelector(
      '[data-roofline-throughput-explorer="explorer"]',
    ) as HTMLElement;
    const regions = Array.from(
      container.querySelectorAll("[data-roofline-control-region]"),
    ) as HTMLElement[];

    expect(regions.length).toBeGreaterThanOrEqual(3);

    const mobileLayouts = [
      {
        width: 360,
        regions: [
          { top: 0, left: 0, width: 360 },
          { top: 72, left: 0, width: 360 },
          { top: 144, left: 0, width: 360 },
          { top: 216, left: 0, width: 360 },
        ],
      },
      {
        width: 1280,
        regions: [
          { top: 0, left: 0, width: 620 },
          { top: 0, left: 640, width: 620 },
          { top: 88, left: 0, width: 620 },
          { top: 88, left: 640, width: 620 },
        ],
      },
    ] as const;

    for (const layout of mobileLayouts) {
      Object.defineProperty(explorer, "clientWidth", {
        configurable: true,
        value: layout.width,
      });

      regions.forEach((region, index) => {
        const position = layout.regions[index];
        if (!position) {
          return;
        }

        region.getBoundingClientRect = () =>
          ({
            top: position.top,
            left: position.left,
            right: position.left + position.width,
            bottom: position.top + 56,
            width: position.width,
            height: 56,
            x: position.left,
            y: position.top,
            toJSON: () => ({}),
          }) as DOMRect;
      });

      const rects = regions.map((region) => region.getBoundingClientRect());
      for (let index = 0; index < rects.length; index += 1) {
        for (
          let otherIndex = index + 1;
          otherIndex < rects.length;
          otherIndex += 1
        ) {
          const overlapWidth =
            Math.min(rects[index].right, rects[otherIndex].right) -
            Math.max(rects[index].left, rects[otherIndex].left);
          const overlapHeight =
            Math.min(rects[index].bottom, rects[otherIndex].bottom) -
            Math.max(rects[index].top, rects[otherIndex].top);

          expect(overlapWidth > 1 && overlapHeight > 1).toBe(false);
        }
      }
    }
  });
});
