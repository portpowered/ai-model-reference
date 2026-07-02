"use client";

import { useState } from "react";
import * as Recharts from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { GraphFrame } from "@/features/graphs/components/GraphFrame";
import type { RooflineModelSizePreset } from "@/lib/content/roofline-model-size-presets";
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
import {
  formatActiveWeightSizeBillions,
  ROOFLINE_EMPTY_PRESETS_MESSAGE,
  ROOFLINE_MODEL_PRESET_CONTROL_LABEL,
  resolveInitialPresetSelection,
  resolvePresetSelection,
} from "./roofline-throughput-explorer-presets";

const AXIS_STROKE =
  "color-mix(in oklch, var(--foreground) 72%, var(--background) 28%)";
const AXIS_TICK_FILL =
  "color-mix(in oklch, var(--foreground) 78%, var(--background) 22%)";
const HOVER_RING = "var(--primary)";
const HOVER_FILL = "var(--background)";

const DEFAULT_BYTES_PER_PARAMETER = 2;
const DEFAULT_MEMORY_BANDWIDTH_GBPS = 1000;

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

export type RooflineThroughputExplorerProps = {
  className?: string;
  presets?: readonly RooflineModelSizePreset[];
} & RooflineScenarioInputDraft;

export function RooflineThroughputExplorer({
  className,
  presets = [],
  activeWeightSizeBillions: explicitActiveWeightSizeBillions,
  bytesPerParameter = DEFAULT_BYTES_PER_PARAMETER,
  memoryBandwidthGbps = DEFAULT_MEMORY_BANDWIDTH_GBPS,
  peakComputeFlopsPerSecond,
}: RooflineThroughputExplorerProps) {
  const [presetSelection, setPresetSelection] = useState(() =>
    presets.length > 0
      ? resolveInitialPresetSelection(presets, explicitActiveWeightSizeBillions)
      : {
          selectedPresetId: null,
          activeWeightSizeBillions: explicitActiveWeightSizeBillions,
        },
  );

  const selectedPreset =
    presetSelection.selectedPresetId == null
      ? undefined
      : presets.find(
          (preset) => preset.modelId === presetSelection.selectedPresetId,
        );

  const scenarioInputs: RooflineScenarioInputDraft = {
    activeWeightSizeBillions: presetSelection.activeWeightSizeBillions,
    bytesPerParameter,
    memoryBandwidthGbps,
    peakComputeFlopsPerSecond,
  };

  const chartModel = buildRooflineThroughputChartModel(scenarioInputs);
  const hasPresets = presets.length > 0;

  function handlePresetChange(modelId: string) {
    setPresetSelection(resolvePresetSelection(presets, modelId));
  }

  return (
    <div className={className} data-roofline-throughput-explorer="explorer">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        {hasPresets ? (
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label
              htmlFor="roofline-model-preset"
              className="text-sm font-medium text-foreground"
            >
              {ROOFLINE_MODEL_PRESET_CONTROL_LABEL}
            </label>
            <select
              id="roofline-model-preset"
              data-testid="roofline-model-preset"
              className="h-8 w-full min-w-0 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              value={presetSelection.selectedPresetId ?? ""}
              onChange={(event) => handlePresetChange(event.target.value)}
            >
              {presets.map((preset) => (
                <option key={preset.modelId} value={preset.modelId}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <p
            className="text-sm text-muted-foreground"
            data-roofline-throughput-explorer="empty-presets"
            role="status"
          >
            {ROOFLINE_EMPTY_PRESETS_MESSAGE}
          </p>
        )}

        {selectedPreset ? (
          <p
            className="text-sm text-muted-foreground"
            data-selected-model-label={selectedPreset.label}
            data-active-weight-size-billions={
              presetSelection.activeWeightSizeBillions ?? ""
            }
          >
            Active weight:{" "}
            <span className="font-medium text-foreground">
              {formatActiveWeightSizeBillions(
                presetSelection.activeWeightSizeBillions,
              )}
              B
            </span>{" "}
            parameters ({selectedPreset.label})
          </p>
        ) : null}
      </div>

      {chartModel.kind === "invalid" ? (
        <div data-roofline-throughput-explorer="invalid" role="alert">
          <p className="text-sm text-destructive">
            Roofline scenario inputs are incomplete or invalid.
          </p>
        </div>
      ) : (
        <div data-roofline-throughput-explorer="chart">
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
      )}
    </div>
  );
}
