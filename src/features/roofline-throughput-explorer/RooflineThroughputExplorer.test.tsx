import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
import { RooflineThroughputExplorer } from "./RooflineThroughputExplorer";
import {
  ROOFLINE_THROUGHPUT_ACTIVE_SCENARIO_LEGEND_LABEL,
  ROOFLINE_THROUGHPUT_BOUNDARY_LEGEND_LABEL,
  ROOFLINE_THROUGHPUT_EXPLORER_AXIS_X,
  ROOFLINE_THROUGHPUT_EXPLORER_AXIS_Y,
  ROOFLINE_THROUGHPUT_EXPLORER_CHART_LABEL,
} from "./roofline-throughput-chart";

const DEFAULT_SCENARIO = {
  activeWeightSizeBillions: 27,
  bytesPerParameter: 2,
  memoryBandwidthGbps: 1000,
} as const;

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
      />,
    );

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(
      screen.getByText("Roofline scenario inputs are incomplete or invalid."),
    ).toBeTruthy();
  });
});
