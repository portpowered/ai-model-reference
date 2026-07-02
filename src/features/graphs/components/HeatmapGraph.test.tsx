import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { HeatmapGraph } from "@/features/graphs/components/HeatmapGraph";

describe("HeatmapGraph", () => {
  test("renders a reusable heatmap shell with its own title and legend", () => {
    const html = renderToStaticMarkup(
      <HeatmapGraph
        axisLabelX="Hidden channel"
        axisLabelY="Token position"
        chartLabel="Hidden State Before ReLU"
        dataTestId="test-heatmap"
        max={3}
        min={-3}
        negativeColor="#ff3b30"
        positiveColor="#2f7dff"
        xLabels={["c1", "c2"]}
        yLabels={["t1", "t2"]}
        zeroColor="var(--background)"
        zMatrix={[
          [-1.2, 0.8],
          [0, 2.1],
        ]}
      />,
    );

    expect(html).toContain('data-heatmap-graph="test-heatmap"');
    expect(html).toContain('data-echarts-heatmap="true"');
    expect(html).toContain('data-heatmap-legend="true"');
    expect(html).toContain("Hidden State Before ReLU");
  });
});
