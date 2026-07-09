import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RooflineModelSizePreset } from "@/lib/content/roofline-model-size-presets";
import { RooflineThroughputExplorer } from "./RooflineThroughputExplorer";
import {
  ROOFLINE_THROUGHPUT_BOUNDARY_LEGEND_LABEL,
  ROOFLINE_THROUGHPUT_EXPLORER_AXIS_X,
  ROOFLINE_THROUGHPUT_EXPLORER_AXIS_Y,
  ROOFLINE_THROUGHPUT_EXPLORER_CHART_LABEL,
} from "./roofline-throughput-chart";
import {
  ROOFLINE_ACTIVE_WEIGHT_SIZE_CONTROL_LABEL,
  ROOFLINE_BATCH_SIZE_CONTROL_LABEL,
  ROOFLINE_QUANTIZATION_BITS_CONTROL_LABEL,
} from "./roofline-throughput-explorer-controls";
import {
  ROOFLINE_EMPTY_PRESETS_MESSAGE,
  ROOFLINE_MODEL_PRESET_CONTROL_LABEL,
} from "./roofline-throughput-explorer-presets";

const DEFAULT_SCENARIO = {
  activeWeightSizeBillions: 27,
  quantizationBits: 16,
  memoryBandwidthGbps: 1000,
} as const;

const TEST_PRESETS = [
  {
    modelId: "model.glm-5-2",
    label: "GLM-5.2",
    effectiveSizeBillions: 40,
  },
  {
    modelId: "model.qwen-3-6-35b-a3b",
    label: "Qwen3.6-35B-A3B",
    effectiveSizeBillions: 3,
  },
  {
    modelId: "model.qwen-3-6-27b",
    label: "Qwen3.6-27B",
    effectiveSizeBillions: 27,
  },
] satisfies RooflineModelSizePreset[];

function getLegendButton(container: HTMLElement, label: string): HTMLButtonElement {
  const buttons = Array.from(
    container.querySelectorAll<HTMLButtonElement>(
      '[data-graph-legend="roofline-throughput-explorer"] button',
    ),
  );
  const button = buttons.find((candidate) => candidate.textContent === label);
  if (!button) {
    throw new Error(`missing legend button ${label}`);
  }

  return button;
}

describe("RooflineThroughputExplorer", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders chart title, axis labels, legend, and boundary line", () => {
    const { container } = render(
      <RooflineThroughputExplorer {...DEFAULT_SCENARIO} />,
    );

    expect(
      screen.getByText(ROOFLINE_THROUGHPUT_EXPLORER_CHART_LABEL),
    ).toBeTruthy();
    expect(
      screen.getAllByText(ROOFLINE_THROUGHPUT_EXPLORER_AXIS_X).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText(ROOFLINE_THROUGHPUT_EXPLORER_AXIS_Y).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      container.querySelector(".recharts-label tspan"),
    ).toBeTruthy();
    expect(
      screen.getByText(ROOFLINE_THROUGHPUT_BOUNDARY_LEGEND_LABEL),
    ).toBeTruthy();
    expect(
      getLegendButton(container, "M1 Ultra").getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      getLegendButton(container, "M1 Max").getAttribute("aria-pressed"),
    ).toBe("true");
    expect(getLegendButton(container, "M1 Pro")).toBeTruthy();
    expect(() => getLegendButton(container, "M3")).toThrow();
    expect(() => getLegendButton(container, "M3 Max")).toThrow();
    expect(getLegendButton(container, "M4")).toBeTruthy();
    expect(getLegendButton(container, "M5 Max")).toBeTruthy();
    expect(
      getLegendButton(container, "RTX 4090").getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      getLegendButton(container, "RTX 5090").getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      getLegendButton(container, "RTX 6000 Ada").getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      container.querySelector(
        '[data-graph-legend="roofline-throughput-explorer"]',
      ),
    ).toBeTruthy();
    expect(container.querySelector(".recharts-line-curve")).toBeTruthy();
    expect(
      container.querySelector(".roofline-throughput-explorer__active-scenario"),
    ).toBeNull();
    expect(
      container.querySelectorAll(
        ".roofline-throughput-explorer__compute-host",
      ).length,
    ).toBe(8);
    expect(
      container.querySelectorAll(
        ".roofline-throughput-explorer__compute-host-label",
      ).length,
    ).toBe(8);
    expect(
      Array.from(
        container.querySelectorAll("[data-roofline-throughput-guide]"),
      ).map((guide) => guide.getAttribute("data-roofline-throughput-guide")),
    ).toContain("20");
    expect(
      container.querySelector('[data-roofline-host-label="m1-pro"]')
        ?.textContent,
    ).toMatch(/^M1 Pro \(.+\)$/);
    expect(
      container.querySelector('[data-roofline-host-label="m1-pro"]')
        ?.textContent,
    ).not.toContain("tok/s");
    expect(
      container.querySelector('[data-roofline-host-label="rtx-5090"]'),
    ).toBeTruthy();
    expect(
      container.querySelector('[data-roofline-throughput-explorer="chart"]'),
    ).toBeTruthy();
  });

  test("toggles compute host dots from the legend and rescales the chart axes", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <RooflineThroughputExplorer {...DEFAULT_SCENARIO} />,
    );

    const rtx5090Toggle = getLegendButton(container, "RTX 5090");
    const rtx6000Toggle = getLegendButton(container, "RTX 6000 Ada");
    const chart = container.querySelector(
      '[data-roofline-throughput-explorer="chart"]',
    );
    const initialYDomainMax = chart?.getAttribute("data-roofline-y-domain-max");
    const initialXDomainMax = chart?.getAttribute("data-roofline-x-domain-max");
    const initialBoundaryPointCount = chart?.getAttribute(
      "data-roofline-boundary-point-count",
    );

    expect(rtx5090Toggle.getAttribute("aria-pressed")).toBe("true");
    expect(
      container.querySelectorAll(
        ".roofline-throughput-explorer__compute-host",
      ).length,
    ).toBe(8);
    expect(initialYDomainMax).toBeTruthy();
    expect(initialXDomainMax).toBeTruthy();
    expect(initialBoundaryPointCount).toBeTruthy();

    await user.click(rtx5090Toggle);

    expect(() => getLegendButton(container, "RTX 5090")).toThrow();
    expect(
      container.querySelectorAll(
        ".roofline-throughput-explorer__compute-host",
      ).length,
    ).toBe(7);

    await user.click(rtx6000Toggle);

    expect(() => getLegendButton(container, "RTX 6000 Ada")).toThrow();
    expect(
      container.querySelectorAll(
        ".roofline-throughput-explorer__compute-host",
      ).length,
    ).toBe(6);
    const reducedYDomainMax = chart?.getAttribute("data-roofline-y-domain-max");
    const reducedXDomainMax = chart?.getAttribute("data-roofline-x-domain-max");
    const reducedBoundaryPointCount = chart?.getAttribute(
      "data-roofline-boundary-point-count",
    );
    expect(reducedYDomainMax).toBeTruthy();
    expect(reducedXDomainMax).toBeTruthy();
    expect(reducedBoundaryPointCount).toBeTruthy();
    expect(Number(reducedYDomainMax)).toBeLessThan(Number(initialYDomainMax));
    expect(Number(reducedXDomainMax)).toBeLessThan(Number(initialXDomainMax));
    expect(Number(reducedBoundaryPointCount)).toBeLessThan(
      Number(initialBoundaryPointCount),
    );

  }, 20_000);

  test("exposes additional compute hosts from the dropdown without scatter tooltip interference", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <RooflineThroughputExplorer {...DEFAULT_SCENARIO} />,
    );

    expect(container.querySelector(".recharts-scatter")).toBeNull();
    expect(
      container.querySelectorAll(
        ".roofline-throughput-explorer__compute-host",
      ).length,
    ).toBe(8);

    await user.click(screen.getByTestId("roofline-compute-host-dropdown"));
    await user.click(screen.getByRole("menuitemcheckbox", { name: /H200 SXM/ }));
    await user.click(screen.getByRole("menuitemcheckbox", { name: /DGX Spark/ }));
    await user.click(
      screen.getByRole("menuitemcheckbox", { name: /Huawei Ascend 910C/ }),
    );
    await user.click(
      screen.getByRole("menuitemcheckbox", { name: /Vera Rubin/ }),
    );

    expect(
      container.querySelectorAll(
        ".roofline-throughput-explorer__compute-host",
      ).length,
    ).toBe(12);
    expect(getLegendButton(container, "H200 SXM")).toBeTruthy();
    expect(getLegendButton(container, "DGX Spark")).toBeTruthy();
    expect(getLegendButton(container, "Huawei Ascend 910C")).toBeTruthy();
    expect(getLegendButton(container, "Vera Rubin")).toBeTruthy();
  }, 20_000);

  test("shows compute host throughput only when hovering the host dot", () => {
    const { container } = render(
      <RooflineThroughputExplorer {...DEFAULT_SCENARIO} />,
    );

    const firstHostDot = container.querySelector(
      ".roofline-throughput-explorer__compute-host",
    );

    expect(firstHostDot).toBeTruthy();
    expect(container.querySelector("[data-roofline-host-tooltip]")).toBeNull();

    fireEvent.mouseOver(firstHostDot as Element);

    const hostTooltip = container.querySelector(
      '[data-roofline-host-tooltip="m1-pro"]',
    );
    expect(hostTooltip).toBeTruthy();
    expect(hostTooltip?.textContent).toContain("M1 Pro");
    expect(hostTooltip?.textContent).toContain("Max decode");
    expect(hostTooltip?.textContent).toContain("tok/s");
    expect(hostTooltip?.textContent).toContain("Bandwidth");
    expect(hostTooltip?.textContent).toContain("200 GB/s");
    expect(hostTooltip?.textContent).toContain("FLOP/s");
  });

  test("recomputes chart state when quantization bits changes via controls", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <RooflineThroughputExplorer {...DEFAULT_SCENARIO} />,
    );

    const chart = container.querySelector(
      '[data-roofline-throughput-explorer="chart"]',
    );
    const initialDecodeTokens = chart?.getAttribute(
      "data-decode-tokens-per-second",
    );
    expect(initialDecodeTokens).toBeTruthy();

    const quantizationControl = screen.getByTestId(
      "roofline-quantization-bits",
    ) as HTMLInputElement;

    fireEvent.change(quantizationControl, { target: { value: "8" } });

    const updatedDecodeTokens = chart?.getAttribute(
      "data-decode-tokens-per-second",
    );
    expect(updatedDecodeTokens).toBeTruthy();
    expect(updatedDecodeTokens).not.toBe(initialDecodeTokens);
    expect(container.querySelector(".recharts-line-curve")).toBeTruthy();
    expect(quantizationControl.value).toBe("8");
    await user.tab();
  }, 20_000);

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
    expect(presetControl.value).toBe("model.qwen-3-6-35b-a3b");
    expect(
      container
        .querySelector("[data-active-weight-size-billions]")
        ?.getAttribute("data-active-weight-size-billions"),
    ).toBe("3");
    expect(
      container
        .querySelector("[data-selected-model-label]")
        ?.getAttribute("data-selected-model-label"),
    ).toBe("Qwen3.6-35B-A3B");
    expect(
      screen.getByLabelText(ROOFLINE_ACTIVE_WEIGHT_SIZE_CONTROL_LABEL),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(ROOFLINE_QUANTIZATION_BITS_CONTROL_LABEL),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(ROOFLINE_BATCH_SIZE_CONTROL_LABEL),
    ).toBeTruthy();
    expect(
      screen.getByText(ROOFLINE_THROUGHPUT_EXPLORER_CHART_LABEL),
    ).toBeTruthy();
  });

  test("updates the chart state when a different preset is selected", async () => {
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
    const chart = container.querySelector(
      '[data-roofline-throughput-explorer="chart"]',
    );
    const initialDecodeTokens = chart?.getAttribute(
      "data-decode-tokens-per-second",
    );

    expect(
      activeWeightSummary?.getAttribute("data-active-weight-size-billions"),
    ).toBe("3");

    await user.selectOptions(
      screen.getByTestId("roofline-model-preset"),
      "model.qwen-3-6-27b",
    );

    const updatedDecodeTokens = chart?.getAttribute(
      "data-decode-tokens-per-second",
    );

    expect(
      activeWeightSummary?.getAttribute("data-active-weight-size-billions"),
    ).toBe("27");
    expect(
      container
        .querySelector("[data-selected-model-label]")
        ?.getAttribute("data-selected-model-label"),
    ).toBe("Qwen3.6-27B");
    expect(updatedDecodeTokens).toBeTruthy();
    expect(updatedDecodeTokens).not.toBe(initialDecodeTokens);
    expect(container.querySelector(".recharts-line-curve")).toBeTruthy();
  });

  test("renders an accessible empty preset state while still allowing explicit custom inputs", () => {
    render(<RooflineThroughputExplorer presets={[]} {...DEFAULT_SCENARIO} />);

    expect(screen.getByText(ROOFLINE_EMPTY_PRESETS_MESSAGE)).toBeTruthy();
    expect(
      screen.getByLabelText(ROOFLINE_ACTIVE_WEIGHT_SIZE_CONTROL_LABEL),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(ROOFLINE_QUANTIZATION_BITS_CONTROL_LABEL),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(ROOFLINE_BATCH_SIZE_CONTROL_LABEL),
    ).toBeTruthy();
    expect(
      screen.getByText(ROOFLINE_THROUGHPUT_EXPLORER_CHART_LABEL),
    ).toBeTruthy();
    expect(
      screen.queryByLabelText(ROOFLINE_MODEL_PRESET_CONTROL_LABEL),
    ).toBeNull();
  });

  test("updates the chart state when the active weight slider moves", () => {
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
    const chart = container.querySelector(
      '[data-roofline-throughput-explorer="chart"]',
    );
    const initialDecodeTokens = chart?.getAttribute(
      "data-decode-tokens-per-second",
    );

    expect(
      activeWeightOutput?.getAttribute("data-active-weight-size-billions"),
    ).toBe("3");
    expect(initialDecodeTokens).toBeTruthy();

    fireEvent.change(slider, { target: { value: "55" } });

    const updatedDecodeTokens = chart?.getAttribute(
      "data-decode-tokens-per-second",
    );

    expect(
      activeWeightOutput?.getAttribute("data-active-weight-size-billions"),
    ).toBe("55");
    expect(updatedDecodeTokens).toBeTruthy();
    expect(Number(updatedDecodeTokens)).toBeLessThan(
      Number(initialDecodeTokens),
    );
    expect(container.querySelector(".recharts-line-curve")).toBeTruthy();
  });

  test("updates the chart boundary when quantization bits changes", () => {
    const { container } = render(
      <RooflineThroughputExplorer {...DEFAULT_SCENARIO} />,
    );

    const chart = container.querySelector(
      '[data-roofline-throughput-explorer="chart"]',
    );
    const initialDecodeTokens = chart?.getAttribute(
      "data-decode-tokens-per-second",
    );
    expect(initialDecodeTokens).toBeTruthy();

    const quantizationControl = screen.getByTestId(
      "roofline-quantization-bits",
    ) as HTMLInputElement;

    fireEvent.change(quantizationControl, { target: { value: "6" } });

    const updatedDecodeTokens = chart?.getAttribute(
      "data-decode-tokens-per-second",
    );
    expect(updatedDecodeTokens).toBeTruthy();
    expect(updatedDecodeTokens).not.toBe(initialDecodeTokens);
    expect(quantizationControl.value).toBe("6");
  });

  test("updates the chart boundary when batch size changes", () => {
    const { container } = render(
      <RooflineThroughputExplorer {...DEFAULT_SCENARIO} />,
    );

    const chart = container.querySelector(
      '[data-roofline-throughput-explorer="chart"]',
    );
    const initialDecodeTokens = chart?.getAttribute(
      "data-decode-tokens-per-second",
    );
    const initialBoundaryMax = chart?.getAttribute(
      "data-roofline-boundary-y-max",
    );
    expect(initialDecodeTokens).toBeTruthy();
    expect(initialBoundaryMax).toBeTruthy();

    const batchControl = screen.getByTestId(
      "roofline-batch-size",
    ) as HTMLInputElement;

    fireEvent.change(batchControl, { target: { value: "8" } });

    const updatedDecodeTokens = chart?.getAttribute(
      "data-decode-tokens-per-second",
    );
    const updatedBoundaryMax = chart?.getAttribute(
      "data-roofline-boundary-y-max",
    );
    expect(updatedDecodeTokens).toBeTruthy();
    expect(updatedBoundaryMax).toBeTruthy();
    expect(Number(updatedDecodeTokens)).toBeGreaterThan(
      Number(initialDecodeTokens),
    );
    expect(Number(updatedBoundaryMax)).toBeGreaterThan(
      Number(initialBoundaryMax),
    );
    expect(batchControl.value).toBe("8");
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
  }, 20_000);

  test("defaults to 8-bit quantization when no precision is supplied", () => {
    render(
      <RooflineThroughputExplorer
        activeWeightSizeBillions={27}
        memoryBandwidthGbps={1000}
      />,
    );

    expect(
      (screen.getByTestId("roofline-quantization-bits") as HTMLInputElement)
        .value,
    ).toBe("8");
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
    expect(container.querySelector(".recharts-line-curve")).toBeTruthy();
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

    const chart = container.querySelector(
      '[data-roofline-throughput-explorer="chart"]',
    );
    const initialDecodeTokens = chart?.getAttribute(
      "data-decode-tokens-per-second",
    );
    expect(initialDecodeTokens).toBeTruthy();

    await user.selectOptions(
      screen.getByTestId("roofline-model-preset"),
      "__roofline_custom_override__",
    );

    const quantizationControl = screen.getByTestId(
      "roofline-quantization-bits",
    ) as HTMLInputElement;

    fireEvent.change(quantizationControl, { target: { value: "" } });
    expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
    expect(
      chart?.getAttribute("data-decode-tokens-per-second"),
    ).toBe(initialDecodeTokens);

    fireEvent.change(quantizationControl, { target: { value: "4" } });
    expect(quantizationControl.value).toBe("4");
    expect(
      chart?.getAttribute("data-decode-tokens-per-second"),
    ).not.toBe(initialDecodeTokens);
  });
});
