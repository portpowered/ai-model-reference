"use client";

import * as Recharts from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { GraphFrame } from "@/features/graphs/components/GraphFrame";
import type { RooflineScenarioInputDraft } from "./roofline-throughput-calculation";
import {
  buildRooflineThroughputChartModel,
  formatRooflineBandwidthGbps,
  formatRooflineComputeFlopsPerSecond,
  ROOFLINE_THROUGHPUT_ACTIVE_SCENARIO_COLOR,
  ROOFLINE_THROUGHPUT_ACTIVE_SCENARIO_LEGEND_LABEL,
  ROOFLINE_THROUGHPUT_BOUNDARY_COLOR,
  ROOFLINE_THROUGHPUT_BOUNDARY_LEGEND_LABEL,
  ROOFLINE_THROUGHPUT_EXPLORER_AXIS_X,
  ROOFLINE_THROUGHPUT_EXPLORER_AXIS_Y,
  ROOFLINE_THROUGHPUT_EXPLORER_CHART_LABEL,
} from "./roofline-throughput-chart";

const AXIS_STROKE =
  "color-mix(in oklch, var(--foreground) 72%, var(--background) 28%)";
const AXIS_TICK_FILL =
  "color-mix(in oklch, var(--foreground) 78%, var(--background) 22%)";
const HOVER_RING = "var(--primary)";
const HOVER_FILL = "var(--background)";

const ROOFLINE_CHART_CONFIG = {
  maximumThroughputBoundary: {
    label: ROOFLINE_THROUGHPUT_BOUNDARY_LEGEND_LABEL,
    color: ROOFLINE_THROUGHPUT_BOUNDARY_COLOR,
  },
  activeScenario: {
    label: ROOFLINE_THROUGHPUT_ACTIVE_SCENARIO_LEGEND_LABEL,
    color: ROOFLINE_THROUGHPUT_ACTIVE_SCENARIO_COLOR,
  },
} satisfies ChartConfig;

export type RooflineThroughputExplorerProps = RooflineScenarioInputDraft & {
  className?: string;
};

export function RooflineThroughputExplorer({
  className,
  ...scenarioInputs
}: RooflineThroughputExplorerProps) {
  const chartModel = buildRooflineThroughputChartModel(scenarioInputs);

  if (chartModel.kind === "invalid") {
    return (
      <div
        className={className}
        data-roofline-throughput-explorer="invalid"
        role="alert"
      >
        <p className="text-sm text-destructive">
          Roofline scenario inputs are incomplete or invalid.
        </p>
      </div>
    );
  }

  return (
    <div className={className} data-roofline-throughput-explorer="chart">
      <GraphFrame
        axisLabelX={ROOFLINE_THROUGHPUT_EXPLORER_AXIS_X}
        axisLabelY={ROOFLINE_THROUGHPUT_EXPLORER_AXIS_Y}
        chartLabel={ROOFLINE_THROUGHPUT_EXPLORER_CHART_LABEL}
        legend={[
          {
            color: ROOFLINE_THROUGHPUT_BOUNDARY_COLOR,
            label: ROOFLINE_THROUGHPUT_BOUNDARY_LEGEND_LABEL,
          },
          {
            color: ROOFLINE_THROUGHPUT_ACTIVE_SCENARIO_COLOR,
            label: ROOFLINE_THROUGHPUT_ACTIVE_SCENARIO_LEGEND_LABEL,
          },
        ]}
        legendTestId="roofline-throughput-explorer"
        body={
          <ChartContainer
            config={ROOFLINE_CHART_CONFIG}
            className="h-[22rem] rounded-none border-0 border-b border-border/70 shadow-none"
          >
            <Recharts.LineChart
              accessibilityLayer
              data={[...chartModel.data]}
              margin={{ top: 20, right: 24, bottom: 24, left: 24 }}
            >
              <Recharts.ReferenceLine
                y={0}
                stroke="var(--border)"
                strokeDasharray="4 4"
              />
              <Recharts.ReferenceLine
                x={chartModel.xDomain[0]}
                stroke="var(--border)"
                strokeDasharray="4 4"
              />
              <Recharts.XAxis
                dataKey="memoryBandwidthGbps"
                type="number"
                domain={[...chartModel.xDomain]}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                stroke={AXIS_STROKE}
                tick={{ fill: AXIS_TICK_FILL, fontSize: 12 }}
                tickFormatter={(value) =>
                  formatRooflineBandwidthGbps(Number(value))
                }
              />
              <Recharts.YAxis
                domain={[...chartModel.yDomain]}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                width={48}
                stroke={AXIS_STROKE}
                tick={{ fill: AXIS_TICK_FILL, fontSize: 12 }}
                tickFormatter={(value) =>
                  formatRooflineComputeFlopsPerSecond(Number(value))
                }
              />
              <ChartTooltip
                cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) =>
                      `Memory bandwidth: ${formatRooflineBandwidthGbps(Number(label))} GB/s`
                    }
                    formatter={(value, name) => {
                      const seriesLabel =
                        name === "maximumThroughputBoundary"
                          ? ROOFLINE_THROUGHPUT_BOUNDARY_LEGEND_LABEL
                          : ROOFLINE_THROUGHPUT_ACTIVE_SCENARIO_LEGEND_LABEL;

                      return [
                        `${formatRooflineComputeFlopsPerSecond(Number(value))} FLOP/s`,
                        seriesLabel,
                      ];
                    }}
                  />
                }
              />
              <Recharts.Line
                type="monotone"
                dataKey="maximumThroughputBoundary"
                className="roofline-throughput-explorer__boundary"
                stroke={ROOFLINE_THROUGHPUT_BOUNDARY_COLOR}
                strokeWidth={3.5}
                dot={false}
                activeDot={{
                  r: 4.5,
                  fill: HOVER_FILL,
                  stroke: HOVER_RING,
                  strokeWidth: 2.5,
                }}
              />
              <Recharts.ReferenceDot
                x={chartModel.activePoint.memoryBandwidthGbps}
                y={chartModel.activePoint.maximumComputeFlopsPerSecond}
                className="roofline-throughput-explorer__active-scenario"
                r={5.5}
                fill={ROOFLINE_THROUGHPUT_ACTIVE_SCENARIO_COLOR}
                stroke={HOVER_RING}
                strokeWidth={2}
              />
            </Recharts.LineChart>
          </ChartContainer>
        }
      />
    </div>
  );
}
