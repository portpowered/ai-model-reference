"use client";

import * as Recharts from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { usePageMessages } from "@/features/docs/components/page-messages-context";
import { GraphFrame } from "@/features/graphs/components/GraphFrame";

const ROOFLINE_CHART_IDS = {
  "chart.roofline-model.teaching": true,
} as const;

const PEAK_COMPUTE_GFLOPS = 100;
const MEMORY_BANDWIDTH_GBS = 10;
const RIDGE_INTENSITY = PEAK_COMPUTE_GFLOPS / MEMORY_BANDWIDTH_GBS;
const X_AXIS_MAX = 16;

const MEMORY_BOUND_FILL =
  "color-mix(in oklch, var(--accent) 28%, var(--background) 72%)";
const COMPUTE_BOUND_FILL =
  "color-mix(in oklch, var(--primary) 22%, var(--background) 78%)";
const ROOFLINE_STROKE = "var(--primary)";
const LOW_INTENSITY_COLOR = "var(--accent)";
const HIGH_INTENSITY_COLOR =
  "color-mix(in oklch, var(--secondary-foreground) 70%, var(--primary) 30%)";

const AXIS_STROKE =
  "color-mix(in oklch, var(--foreground) 72%, var(--background) 28%)";
const AXIS_TICK_FILL =
  "color-mix(in oklch, var(--foreground) 78%, var(--background) 22%)";

type RooflineChartId = keyof typeof ROOFLINE_CHART_IDS;

type RooflineDataPoint = {
  intensity: number;
  attainableThroughput: number;
  lowIntensityWorkload?: number;
  highIntensityWorkload?: number;
};

function buildRooflineData(): RooflineDataPoint[] {
  const intensities = [0, 2, 4, 6, 8, RIDGE_INTENSITY, 12, 14, X_AXIS_MAX];
  const lowIntensity = 3;
  const highIntensity = 14;

  return intensities.map((intensity) => {
    const attainableThroughput = Math.min(
      PEAK_COMPUTE_GFLOPS,
      MEMORY_BANDWIDTH_GBS * intensity,
    );

    return {
      intensity,
      attainableThroughput,
      lowIntensityWorkload:
        intensity === lowIntensity ? attainableThroughputFor(lowIntensity) : undefined,
      highIntensityWorkload:
        intensity === highIntensity
          ? attainableThroughputFor(highIntensity)
          : undefined,
    };
  });
}

function attainableThroughputFor(intensity: number): number {
  return Math.min(PEAK_COMPUTE_GFLOPS, MEMORY_BANDWIDTH_GBS * intensity);
}

function legendLabel(
  legend: Record<string, { label: string }> | undefined,
  key: string,
  fallback: string,
): string {
  return legend?.[key]?.label ?? fallback;
}

export function isRooflineChartId(
  chartId: string,
): chartId is RooflineChartId {
  return chartId in ROOFLINE_CHART_IDS;
}

export function RooflineTeachingChart({
  assetId,
  chartId,
  alt,
  caption,
}: {
  assetId: string;
  chartId: string;
  alt?: string;
  caption?: string;
}) {
  if (!isRooflineChartId(chartId)) {
    return null;
  }

  const { messages } = usePageMessages();
  const assetMessages = messages.assets?.[assetId];
  const legend = assetMessages?.legend;
  const data = buildRooflineData();

  const chartConfig = {
    attainableThroughput: {
      label: legendLabel(legend, "attainableThroughput", "Attainable throughput"),
      color: ROOFLINE_STROKE,
    },
    lowIntensityWorkload: {
      label: legendLabel(
        legend,
        "lowIntensityWorkload",
        "Low-intensity workload",
      ),
      color: LOW_INTENSITY_COLOR,
    },
    highIntensityWorkload: {
      label: legendLabel(
        legend,
        "highIntensityWorkload",
        "High-intensity workload",
      ),
      color: HIGH_INTENSITY_COLOR,
    },
  } satisfies ChartConfig;

  const chartLabel =
    assetMessages?.title ?? "Illustrative Roofline Ceiling";
  const axisLabelX = legendLabel(
    legend,
    "axisX",
    "Arithmetic intensity (ops per byte)",
  );
  const axisLabelY = legendLabel(
    legend,
    "axisY",
    "Attainable throughput (GFLOP/s)",
  );

  return (
    <figure data-page-asset={assetId} data-asset-type="chart">
      <GraphFrame
        axisLabelX={axisLabelX}
        axisLabelY={axisLabelY}
        chartLabel={chartLabel}
        legend={[
          {
            color: ROOFLINE_STROKE,
            label: legendLabel(
              legend,
              "attainableThroughput",
              "Attainable throughput",
            ),
          },
          {
            color: MEMORY_BOUND_FILL,
            label: legendLabel(
              legend,
              "memoryBoundRegion",
              "Memory-bandwidth bound",
            ),
          },
          {
            color: COMPUTE_BOUND_FILL,
            label: legendLabel(legend, "computeBoundRegion", "Compute bound"),
          },
          {
            color: LOW_INTENSITY_COLOR,
            label: legendLabel(
              legend,
              "lowIntensityWorkload",
              "Low-intensity workload",
            ),
          },
          {
            color: HIGH_INTENSITY_COLOR,
            label: legendLabel(
              legend,
              "highIntensityWorkload",
              "High-intensity workload",
            ),
          },
        ]}
        legendTestId={chartId}
        body={
          <ChartContainer
            config={chartConfig}
            className="h-[22rem] rounded-none border-0 border-b border-border/70 shadow-none"
          >
            <Recharts.ComposedChart
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
              <Recharts.ReferenceArea
                x1={0}
                x2={RIDGE_INTENSITY}
                y1={0}
                y2={PEAK_COMPUTE_GFLOPS}
                fill={MEMORY_BOUND_FILL}
                fillOpacity={0.45}
                strokeOpacity={0}
              />
              <Recharts.ReferenceArea
                x1={RIDGE_INTENSITY}
                x2={X_AXIS_MAX}
                y1={0}
                y2={PEAK_COMPUTE_GFLOPS}
                fill={COMPUTE_BOUND_FILL}
                fillOpacity={0.35}
                strokeOpacity={0}
              />
              <Recharts.XAxis
                dataKey="intensity"
                type="number"
                domain={[0, X_AXIS_MAX]}
                ticks={[0, 4, 8, 12, 16]}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                stroke={AXIS_STROKE}
                tick={{ fill: AXIS_TICK_FILL, fontSize: 12 }}
              />
              <Recharts.YAxis
                domain={[0, PEAK_COMPUTE_GFLOPS]}
                ticks={[0, 25, 50, 75, 100]}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                width={40}
                stroke={AXIS_STROKE}
                tick={{ fill: AXIS_TICK_FILL, fontSize: 12 }}
              />
              <ChartTooltip
                cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }}
                content={<ChartTooltipContent />}
              />
              <Recharts.Line
                type="linear"
                dataKey="attainableThroughput"
                stroke={ROOFLINE_STROKE}
                strokeWidth={3.5}
                dot={false}
                activeDot={{
                  r: 4.5,
                  fill: "var(--background)",
                  stroke: ROOFLINE_STROKE,
                  strokeWidth: 2.5,
                }}
              />
              <Recharts.Scatter
                dataKey="lowIntensityWorkload"
                fill={LOW_INTENSITY_COLOR}
                shape="circle"
              />
              <Recharts.Scatter
                dataKey="highIntensityWorkload"
                fill={HIGH_INTENSITY_COLOR}
                shape="circle"
              />
            </Recharts.ComposedChart>
          </ChartContainer>
        }
      />

      <div
        className="sr-only"
        role="img"
        aria-label={alt ?? chartLabel}
        data-chart-id={chartId}
      >
        {alt ?? chartLabel}
      </div>

      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
