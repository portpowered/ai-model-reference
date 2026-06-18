import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { LineGraph } from "@/features/graphs/components/LineGraph";

const SAMPLE_DATA = [
  { x: -1, relu: 0, silu: -0.269 },
  { x: 0, relu: 0, silu: 0 },
  { x: 1, relu: 1, silu: 0.731 },
] as const;

describe("LineGraph", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders a reusable line graph with a shared frame and legend", () => {
    const { container } = render(
      <LineGraph
        axisLabelX="x"
        axisLabelY="f(x)"
        chartLabel="Activation Curves"
        data={SAMPLE_DATA}
        dataTestId="chart.activation-family.relu-silu-comparison"
        series={[
          {
            dataKey: "relu",
            label: "ReLU",
            color: "var(--primary)",
          },
          {
            dataKey: "silu",
            label: "SiLU",
            color: "var(--secondary-foreground)",
          },
        ]}
        tooltipLabelFormatter={(label) => `x = ${label}`}
        tooltipValueFormatter={(value) => value.toString()}
        xAxis={{
          dataKey: "x",
          domain: [-1, 1],
          ticks: [-1, 0, 1],
        }}
        yAxis={{
          domain: [-1, 1],
          ticks: [-1, 0, 1],
        }}
      />,
    );

    expect(container.textContent).toContain("Activation Curves");
    expect(container.querySelectorAll(".recharts-line-curve").length).toBe(2);
    expect(
      container.querySelector(
        '[data-graph-legend="chart.activation-family.relu-silu-comparison"]',
      ),
    ).toBeTruthy();
    expect(container.querySelector(".line-graph__line--relu")).toBeTruthy();
    expect(container.querySelector(".line-graph__line--silu")).toBeTruthy();
  });
});
