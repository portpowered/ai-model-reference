"use client";

import * as Recharts from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { GraphFrame } from "@/features/graphs/components/GraphFrame";
import {
  TRAINING_SIGNAL_BAND_KEYS,
  TRAINING_SIGNAL_BAND_LABELS,
} from "@/features/graphs/training-signal/training-signal-band-keys";
import {
  formatTrainingSignalValue,
  type TrainingSignalChartLabeling,
  type TrainingSignalChartMetadata,
  type TrainingSignalTimelinePoint,
} from "@/features/graphs/training-signal/training-signal-chart-contract";
import { TRAINING_SIGNAL_BAND_COLORS } from "@/features/graphs/training-signal/training-signal-chart-tokens";

const AXIS_STROKE =
  "color-mix(in oklch, var(--foreground) 72%, var(--background) 28%)";
const AXIS_TICK_FILL =
  "color-mix(in oklch, var(--foreground) 78%, var(--background) 22%)";
const TRAINING_SIGNAL_STACK_ID = "training-signal-mix";
const TRAINING_SIGNAL_X_AXIS_LABEL = "Time";

function buildTrainingSignalChartConfig(): ChartConfig {
  return TRAINING_SIGNAL_BAND_KEYS.reduce((config, bandKey) => {
    config[bandKey] = {
      label: TRAINING_SIGNAL_BAND_LABELS[bandKey],
      color: TRAINING_SIGNAL_BAND_COLORS[bandKey],
    };
    return config;
  }, {} as ChartConfig);
}

export function TrainingSignalStackedAreaGraph({
  chartTitleId,
  dataTestId,
  labeling,
  metadata,
  timeline,
}: {
  chartTitleId: string;
  dataTestId: string;
  labeling: TrainingSignalChartLabeling;
  metadata: TrainingSignalChartMetadata;
  timeline: readonly TrainingSignalTimelinePoint[];
}) {
  const chartConfig = buildTrainingSignalChartConfig();
  const chartData = timeline.map((point) => ({
    timeLabel: point.timeLabel,
    timeKey: point.timeKey,
    ...TRAINING_SIGNAL_BAND_KEYS.reduce(
      (values, bandKey) => {
        values[bandKey] = point[bandKey];
        return values;
      },
      {} as Record<(typeof TRAINING_SIGNAL_BAND_KEYS)[number], number>,
    ),
  }));

  return (
    <div data-training-signal-chart-surface="ready">
      <GraphFrame
        axisLabelX={TRAINING_SIGNAL_X_AXIS_LABEL}
        axisLabelY={labeling.yAxisLabel}
        chartLabel={labeling.accessibleName}
        chartTitleId={chartTitleId}
        legend={TRAINING_SIGNAL_BAND_KEYS.map((bandKey) => ({
          color: TRAINING_SIGNAL_BAND_COLORS[bandKey],
          label: TRAINING_SIGNAL_BAND_LABELS[bandKey],
        }))}
        legendTestId={dataTestId}
        body={
          <ChartContainer
            config={chartConfig}
            className="h-[22rem] rounded-none border-0 border-b border-border/70 shadow-none"
          >
            <Recharts.AreaChart
              accessibilityLayer
              data={chartData}
              margin={{ top: 20, right: 24, bottom: 24, left: 24 }}
            >
              <Recharts.CartesianGrid
                stroke="var(--border)"
                strokeDasharray="4 4"
                vertical={false}
              />
              <Recharts.XAxis
                dataKey="timeLabel"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                stroke={AXIS_STROKE}
                tick={{ fill: AXIS_TICK_FILL, fontSize: 12 }}
              />
              <Recharts.YAxis
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                ticks={[0, 25, 50, 75, 100]}
                width={36}
                stroke={AXIS_STROKE}
                tick={{ fill: AXIS_TICK_FILL, fontSize: 12 }}
              />
              <ChartTooltip
                cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(timeLabel) =>
                      `${timeLabel} (${labeling.tooltipStatusHint})`
                    }
                    formatter={(value, _name) =>
                      formatTrainingSignalValue(
                        Number(value),
                        metadata.valueMode,
                      )
                    }
                  />
                }
              />
              {TRAINING_SIGNAL_BAND_KEYS.map((bandKey) => (
                <Recharts.Area
                  key={bandKey}
                  className={`training-signal-area--${bandKey}`}
                  dataKey={bandKey}
                  fill={TRAINING_SIGNAL_BAND_COLORS[bandKey]}
                  fillOpacity={0.85}
                  stackId={TRAINING_SIGNAL_STACK_ID}
                  stroke={TRAINING_SIGNAL_BAND_COLORS[bandKey]}
                  type="monotone"
                />
              ))}
            </Recharts.AreaChart>
          </ChartContainer>
        }
      />
    </div>
  );
}
