"use client";

import * as Recharts from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { GraphFrame } from "@/features/graphs/components/GraphFrame";

const AXIS_STROKE =
  "color-mix(in oklch, var(--foreground) 72%, var(--background) 28%)";
const AXIS_TICK_FILL =
  "color-mix(in oklch, var(--foreground) 78%, var(--background) 22%)";
const HOVER_RING = "var(--primary)";
const HOVER_FILL = "var(--background)";

export type LineGraphSeries = {
  color: string;
  dataKey: string;
  label: string;
  strokeWidth?: number;
};

export type LineGraphDataPoint = Record<string, number | string>;

export function buildLineGraphConfig(
  series: readonly LineGraphSeries[],
): ChartConfig {
  return series.reduce((config, item) => {
    config[item.dataKey] = {
      label: item.label,
      color: item.color,
    };
    return config;
  }, {} as ChartConfig);
}

export function LineGraph({
  axisLabelX,
  axisLabelY,
  chartLabel,
  className,
  data,
  dataTestId,
  series,
  tooltipLabelFormatter,
  tooltipValueFormatter,
  xAxis,
  yAxis,
}: {
  axisLabelX: string;
  axisLabelY: string;
  chartLabel: string;
  className?: string;
  data: readonly LineGraphDataPoint[];
  dataTestId?: string;
  series: readonly LineGraphSeries[];
  tooltipLabelFormatter?: (label: React.ReactNode) => React.ReactNode;
  tooltipValueFormatter?: (value: number, name: string) => React.ReactNode;
  xAxis: {
    dataKey: string;
    domain?: readonly [number, number];
    ticks?: readonly number[];
  };
  yAxis: {
    domain?: readonly [number, number];
    ticks?: readonly number[];
    width?: number;
  };
}) {
  const chartConfig = buildLineGraphConfig(series);

  return (
    <div className={className}>
      <GraphFrame
        axisLabelX={axisLabelX}
        axisLabelY={axisLabelY}
        chartLabel={chartLabel}
        legend={series.map((item) => ({
          color: item.color,
          label: item.label,
        }))}
        legendTestId={dataTestId}
        body={
          <ChartContainer
            config={chartConfig}
            className="h-[22rem] rounded-none border-0 border-b border-border/70 shadow-none"
          >
            <Recharts.LineChart
              accessibilityLayer
              data={data}
              margin={{ top: 20, right: 24, bottom: 24, left: 24 }}
            >
              <Recharts.ReferenceLine
                y={0}
                stroke="var(--border)"
                strokeDasharray="4 4"
              />
              <Recharts.ReferenceLine
                x={0}
                stroke="var(--border)"
                strokeDasharray="4 4"
              />
              <Recharts.XAxis
                dataKey={xAxis.dataKey}
                type="number"
                domain={xAxis.domain ? [...xAxis.domain] : undefined}
                ticks={xAxis.ticks ? [...xAxis.ticks] : undefined}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                stroke={AXIS_STROKE}
                tick={{ fill: AXIS_TICK_FILL, fontSize: 12 }}
              />
              <Recharts.YAxis
                domain={yAxis.domain ? [...yAxis.domain] : undefined}
                ticks={yAxis.ticks ? [...yAxis.ticks] : undefined}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                width={yAxis.width ?? 36}
                stroke={AXIS_STROKE}
                tick={{ fill: AXIS_TICK_FILL, fontSize: 12 }}
              />
              <ChartTooltip
                cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }}
                content={
                  <ChartTooltipContent
                    labelFormatter={tooltipLabelFormatter}
                    formatter={(value, name) =>
                      tooltipValueFormatter
                        ? tooltipValueFormatter(Number(value), String(name))
                        : Number(value).toString()
                    }
                  />
                }
              />
              {series.map((item) => (
                <Recharts.Line
                  key={item.dataKey}
                  type="monotone"
                  dataKey={item.dataKey}
                  className={`line-graph__line line-graph__line--${item.dataKey}`}
                  stroke={item.color}
                  strokeWidth={item.strokeWidth ?? 3.5}
                  opacity={1}
                  dot={false}
                  activeDot={{
                    r: 4.5,
                    fill: HOVER_FILL,
                    stroke: HOVER_RING,
                    strokeWidth: 2.5,
                  }}
                />
              ))}
            </Recharts.LineChart>
          </ChartContainer>
        }
      />
    </div>
  );
}
