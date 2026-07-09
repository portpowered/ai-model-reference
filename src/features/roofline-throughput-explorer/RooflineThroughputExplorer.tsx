"use client";

import { ChevronDown, Cpu } from "lucide-react";
import { type FocusEvent, type MouseEvent, useState } from "react";
import * as Recharts from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GraphFrame } from "@/features/graphs/components/GraphFrame";
import type { RooflineModelSizePreset } from "@/lib/content/roofline-model-size-presets";
import type { RooflineScenarioInputDraft } from "./roofline-throughput-calculation";
import {
  buildRooflineThroughputChartModel,
  formatRooflineBandwidthGbps,
  formatRooflineDecodeTokensPerSecond,
  formatRooflineFlopsPerSecond,
  ROOFLINE_COMPUTE_HOST_PRESETS,
  ROOFLINE_THROUGHPUT_BOUNDARY_COLOR,
  ROOFLINE_THROUGHPUT_BOUNDARY_LEGEND_LABEL,
  ROOFLINE_THROUGHPUT_EXPLORER_AXIS_X,
  ROOFLINE_THROUGHPUT_EXPLORER_AXIS_Y,
  ROOFLINE_THROUGHPUT_EXPLORER_CHART_LABEL,
  type RooflineComputeHostId,
  type RooflineThroughputHostPoint,
} from "./roofline-throughput-chart";
import {
  clampActiveWeightSizeBillions,
  clampBatchSize,
  clampQuantizationBits,
  parsePositiveNumberInput,
  ROOFLINE_ACTIVE_WEIGHT_SIZE_CONTROL_LABEL,
  ROOFLINE_ACTIVE_WEIGHT_SIZE_SLIDER_STEP_BILLIONS,
  ROOFLINE_BATCH_SIZE_CONTROL_LABEL,
  ROOFLINE_BATCH_SIZE_MAX,
  ROOFLINE_BATCH_SIZE_MIN,
  ROOFLINE_BATCH_SIZE_STEP,
  ROOFLINE_QUANTIZATION_BITS_CONTROL_LABEL,
  ROOFLINE_QUANTIZATION_BITS_MAX,
  ROOFLINE_QUANTIZATION_BITS_MIN,
  ROOFLINE_QUANTIZATION_BITS_STEP,
  type RooflineScenarioControlEdits,
  type RooflineScenarioControls,
  resolveActiveWeightSliderBounds,
  resolveInitialScenarioControls,
  scenarioControlsFromPreset,
} from "./roofline-throughput-explorer-controls";
import {
  isCustomOverridePresetId,
  ROOFLINE_CUSTOM_OVERRIDE_PRESET_ID,
  ROOFLINE_CUSTOM_OVERRIDE_PRESET_LABEL,
  type RooflineCustomOverrideFieldErrors,
  validateCustomActiveWeightSizeBillions,
  validateCustomBatchSize,
  validateCustomQuantizationBits,
} from "./roofline-throughput-explorer-custom";
import {
  findPresetById,
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

const DEFAULT_MEMORY_BANDWIDTH_GBPS = 1000;

const CONTROL_INPUT_CLASSNAME =
  "h-8 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const DEFAULT_VISIBLE_COMPUTE_HOST_IDS = new Set<RooflineComputeHostId>([
  "m1-pro",
  "m1-max",
  "m1-ultra",
  "m4",
  "m5-max",
  "rtx-4090",
  "rtx-5090",
  "rtx-6000-ada",
]);

const ROOFLINE_CHART_CONFIG = {
  boundaryComputeFlopsPerSecond: {
    label: ROOFLINE_THROUGHPUT_BOUNDARY_LEGEND_LABEL,
    color: ROOFLINE_THROUGHPUT_BOUNDARY_COLOR,
  },
  computeHost: {
    label: "Compute host",
    color: "var(--foreground)",
  },
} satisfies ChartConfig;

type RooflineHostTooltip = {
  host: RooflineThroughputHostPoint;
  left: number;
  placement: "above" | "below";
  top: number;
};

type RooflineBoundaryTooltipPayload = {
  boundaryComputeFlopsPerSecond: number;
  maximumDecodeTokensPerSecond: number;
  memoryBandwidthGbps: number;
};

function isRooflineBoundaryTooltipPayload(
  value: unknown,
): value is RooflineBoundaryTooltipPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "boundaryComputeFlopsPerSecond" in value &&
    "maximumDecodeTokensPerSecond" in value &&
    "memoryBandwidthGbps" in value
  );
}

function RooflineBoundaryTooltipContent({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly { payload?: unknown }[];
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload
    .map((entry) => entry.payload)
    .find(isRooflineBoundaryTooltipPayload);

  if (!point) {
    return null;
  }

  return (
    <div
      className="min-w-48 rounded-lg border border-border bg-popover/95 px-3 py-2 text-sm text-popover-foreground shadow-lg backdrop-blur-sm"
      data-roofline-boundary-tooltip
    >
      <div className="font-semibold tabular-nums text-popover-foreground">
        {formatRooflineDecodeTokensPerSecond(
          point.maximumDecodeTokensPerSecond,
        )}
      </div>
      <div className="text-[0.7rem] text-muted-foreground">total tokens/s</div>
      <div className="mt-2 space-y-1 border-t border-border/70 pt-2 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Memory bandwidth</span>
          <span className="font-medium tabular-nums">
            {formatRooflineBandwidthGbps(point.memoryBandwidthGbps)} GB/s
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 text-muted-foreground">
          <span>Compute</span>
          <span className="tabular-nums">
            {formatRooflineFlopsPerSecond(point.boundaryComputeFlopsPerSecond)}{" "}
            FLOP/s
          </span>
        </div>
      </div>
    </div>
  );
}

function roundRooflineDomainMax(value: number): number {
  return Math.ceil((value * 1.08) / 100) * 100;
}

function resolveVisibleRooflineXDomain(
  chartModel: ReturnType<typeof buildRooflineThroughputChartModel>,
  visibleHostIds: ReadonlySet<string>,
): readonly [number, number] | null {
  if (chartModel.kind !== "valid") {
    return null;
  }

  const visibleHostMax = chartModel.hostPoints.reduce(
    (max, host) =>
      visibleHostIds.has(host.id)
        ? Math.max(max, host.memoryBandwidthGbps)
        : max,
    0,
  );

  if (visibleHostMax <= 0) {
    return chartModel.xDomain;
  }

  return [chartModel.xDomain[0], roundRooflineDomainMax(visibleHostMax)];
}

function resolveVisibleRooflineYDomain(
  chartModel: ReturnType<typeof buildRooflineThroughputChartModel>,
  visibleHostIds: ReadonlySet<string>,
  xDomain: readonly [number, number] | null,
): readonly [number, number] | null {
  if (chartModel.kind !== "valid") {
    return null;
  }

  const xDomainMax = xDomain?.[1] ?? chartModel.xDomain[1];
  const visibleValues = [
    ...chartModel.data
      .filter((point) => point.memoryBandwidthGbps <= xDomainMax)
      .map((point) => point.boundaryComputeFlopsPerSecond),
    ...chartModel.hostPoints
      .filter((host) => visibleHostIds.has(host.id))
      .map((host) => host.computeFlopsPerSecond),
  ].filter((value) => Number.isFinite(value) && value > 0);

  if (visibleValues.length === 0) {
    return chartModel.yDomain;
  }

  const yMin = Math.min(...visibleValues);
  const yMax = Math.max(...visibleValues);

  return [Math.max(1, yMin * 0.85), yMax * 1.15];
}

export type RooflineThroughputExplorerProps = {
  className?: string;
  presets?: readonly RooflineModelSizePreset[];
} & RooflineScenarioInputDraft;

export function RooflineThroughputExplorer({
  className,
  presets = [],
  activeWeightSizeBillions: explicitActiveWeightSizeBillions,
  batchSize: explicitBatchSize,
  bytesPerParameter: explicitBytesPerParameter,
  memoryBandwidthGbps = DEFAULT_MEMORY_BANDWIDTH_GBPS,
  peakComputeFlopsPerSecond,
  quantizationBits: explicitQuantizationBits,
}: RooflineThroughputExplorerProps) {
  const initialScenarioControls = resolveInitialScenarioControls({
    presets,
    explicitActiveWeightSizeBillions,
    explicitBatchSize,
    explicitBytesPerParameter,
    explicitQuantizationBits,
  });

  const [presetSelection, setPresetSelection] = useState(() =>
    presets.length > 0
      ? resolveInitialPresetSelection(presets, explicitActiveWeightSizeBillions)
      : {
          selectedPresetId: null,
          activeWeightSizeBillions: explicitActiveWeightSizeBillions,
        },
  );

  const isCustomOverride = isCustomOverridePresetId(
    presetSelection.selectedPresetId,
  );

  const activeWeightBounds = resolveActiveWeightSliderBounds(presets, {
    customOverride: isCustomOverride,
  });

  const [scenarioControls, setScenarioControls] =
    useState<RooflineScenarioControls>(() => initialScenarioControls);

  const [controlEdits, setControlEdits] =
    useState<RooflineScenarioControlEdits>({
      activeWeightSize: explicitActiveWeightSizeBillions != null,
      batchSize: explicitBatchSize != null,
      quantizationBits:
        explicitQuantizationBits != null || explicitBytesPerParameter != null,
    });

  const [customInputDraft, setCustomInputDraft] = useState({
    activeWeightSizeBillions: String(
      initialScenarioControls.activeWeightSizeBillions,
    ),
    batchSize: String(initialScenarioControls.batchSize),
    quantizationBits: String(initialScenarioControls.quantizationBits),
  });

  const [customFieldErrors, setCustomFieldErrors] =
    useState<RooflineCustomOverrideFieldErrors>({});

  const selectedPreset =
    presetSelection.selectedPresetId == null
      ? undefined
      : presets.find(
          (preset) => preset.modelId === presetSelection.selectedPresetId,
        );

  const scenarioInputs: RooflineScenarioInputDraft = {
    activeWeightSizeBillions: scenarioControls.activeWeightSizeBillions,
    batchSize: scenarioControls.batchSize,
    memoryBandwidthGbps,
    peakComputeFlopsPerSecond,
    quantizationBits: scenarioControls.quantizationBits,
  };

  const chartModel = buildRooflineThroughputChartModel(scenarioInputs);
  const [visibleHostIds, setVisibleHostIds] = useState<ReadonlySet<string>>(
    () => new Set(DEFAULT_VISIBLE_COMPUTE_HOST_IDS),
  );
  const [hostTooltip, setHostTooltip] = useState<RooflineHostTooltip | null>(
    null,
  );
  const visibleXDomain = resolveVisibleRooflineXDomain(
    chartModel,
    visibleHostIds,
  );
  const visibleYDomain = resolveVisibleRooflineYDomain(
    chartModel,
    visibleHostIds,
    visibleXDomain,
  );
  const visibleBoundaryData =
    chartModel.kind === "valid"
      ? chartModel.data.filter(
          (point) =>
            point.boundaryComputeFlopsPerSecond > 0 &&
            point.memoryBandwidthGbps <=
              (visibleXDomain ?? chartModel.xDomain)[1],
        )
      : [];
  const visibleGuidePoints =
    chartModel.kind === "valid"
      ? chartModel.guidePoints.filter(
          (point) =>
            point.memoryBandwidthGbps >=
              (visibleXDomain ?? chartModel.xDomain)[0] &&
            point.memoryBandwidthGbps <=
              (visibleXDomain ?? chartModel.xDomain)[1] &&
            point.boundaryComputeFlopsPerSecond >=
              (visibleYDomain ?? chartModel.yDomain)[0] &&
            point.boundaryComputeFlopsPerSecond <=
              (visibleYDomain ?? chartModel.yDomain)[1],
        )
      : [];
  const visibleBoundaryMaxComputeFlopsPerSecond = visibleBoundaryData.reduce(
    (max, point) => Math.max(max, point.boundaryComputeFlopsPerSecond),
    0,
  );
  const visibleHostCount =
    chartModel.kind === "valid"
      ? chartModel.hostPoints.filter((host) => visibleHostIds.has(host.id))
          .length
      : 0;
  const hasPresets = presets.length > 0;

  function handlePresetChange(modelId: string) {
    if (isCustomOverridePresetId(modelId)) {
      setPresetSelection({
        selectedPresetId: ROOFLINE_CUSTOM_OVERRIDE_PRESET_ID,
        activeWeightSizeBillions: scenarioControls.activeWeightSizeBillions,
      });
      setControlEdits({
        activeWeightSize: true,
        batchSize: true,
        quantizationBits: true,
      });
      setCustomInputDraft({
        activeWeightSizeBillions: String(
          scenarioControls.activeWeightSizeBillions,
        ),
        batchSize: String(scenarioControls.batchSize),
        quantizationBits: String(scenarioControls.quantizationBits),
      });
      setCustomFieldErrors({});
      return;
    }

    const nextPresetSelection = resolvePresetSelection(
      presets,
      modelId,
      scenarioControls.activeWeightSizeBillions,
    );
    const nextPreset = findPresetById(presets, modelId);

    setPresetSelection(nextPresetSelection);
    setControlEdits({
      activeWeightSize: false,
      batchSize: controlEdits.batchSize,
      quantizationBits: controlEdits.quantizationBits,
    });
    setCustomFieldErrors({});
    setScenarioControls((current) =>
      scenarioControlsFromPreset(nextPreset, activeWeightBounds, current, {
        activeWeightSize: false,
        batchSize: controlEdits.batchSize,
        quantizationBits: controlEdits.quantizationBits,
      }),
    );
  }

  function applyValidScenarioControls(next: RooflineScenarioControls) {
    setScenarioControls(next);
    setPresetSelection((current) => ({
      ...current,
      activeWeightSizeBillions: next.activeWeightSizeBillions,
    }));
    setCustomInputDraft({
      activeWeightSizeBillions: String(next.activeWeightSizeBillions),
      batchSize: String(next.batchSize),
      quantizationBits: String(next.quantizationBits),
    });
  }

  function toggleVisibleHost(hostId: string) {
    setHostTooltip(null);
    setVisibleHostIds((current) => {
      const next = new Set(current);
      if (next.has(hostId)) {
        next.delete(hostId);
      } else {
        next.add(hostId);
      }

      return next;
    });
  }

  function setVisibleHost(hostId: string, visible: boolean) {
    setHostTooltip(null);
    setVisibleHostIds((current) => {
      const next = new Set(current);
      if (visible) {
        next.add(hostId);
      } else {
        next.delete(hostId);
      }

      return next;
    });
  }

  function showHostTooltip(
    host: RooflineThroughputHostPoint,
    event: FocusEvent<Element> | MouseEvent<Element>,
  ) {
    const chartContainer = event.currentTarget.closest('[data-slot="chart"]');
    const containerRect = chartContainer?.getBoundingClientRect();
    const targetRect = event.currentTarget.getBoundingClientRect();

    if (!containerRect) {
      setHostTooltip({ host, left: 0, placement: "below", top: 0 });
      return;
    }

    const top = targetRect.top - containerRect.top;

    setHostTooltip({
      host,
      left: targetRect.left - containerRect.left + targetRect.width / 2,
      placement: top < 96 ? "below" : "above",
      top,
    });
  }

  function handleActiveWeightSliderChange(rawValue: string) {
    if (isCustomOverride) {
      handleCustomActiveWeightChange(rawValue);
      return;
    }

    const parsed = Number(rawValue);
    const nextValue = clampActiveWeightSizeBillions(parsed, activeWeightBounds);

    setControlEdits((current) => ({ ...current, activeWeightSize: true }));
    applyValidScenarioControls({
      ...scenarioControls,
      activeWeightSizeBillions: nextValue,
    });
  }

  function handleCustomActiveWeightChange(rawValue: string) {
    setCustomInputDraft((current) => ({
      ...current,
      activeWeightSizeBillions: rawValue,
    }));

    const validation = validateCustomActiveWeightSizeBillions(rawValue);
    if (validation.kind === "invalid") {
      setCustomFieldErrors((current) => ({
        ...current,
        activeWeightSizeBillions: validation.message,
      }));
      return;
    }

    const nextValue = clampActiveWeightSizeBillions(
      validation.value,
      activeWeightBounds,
    );

    setCustomFieldErrors((current) => ({
      ...current,
      activeWeightSizeBillions: undefined,
    }));
    setControlEdits((current) => ({ ...current, activeWeightSize: true }));
    applyValidScenarioControls({
      ...scenarioControls,
      activeWeightSizeBillions: nextValue,
    });
  }

  function handleQuantizationBitsChange(rawValue: string) {
    if (isCustomOverride) {
      setCustomInputDraft((current) => ({
        ...current,
        quantizationBits: rawValue,
      }));

      const validation = validateCustomQuantizationBits(rawValue);
      if (validation.kind === "invalid") {
        setCustomFieldErrors((current) => ({
          ...current,
          quantizationBits: validation.message,
        }));
        return;
      }

      setCustomFieldErrors((current) => ({
        ...current,
        quantizationBits: undefined,
      }));
      setControlEdits((current) => ({ ...current, quantizationBits: true }));
      applyValidScenarioControls({
        ...scenarioControls,
        quantizationBits: validation.value,
      });
      return;
    }

    const parsed = parsePositiveNumberInput(rawValue);
    if (parsed == null) {
      return;
    }

    const nextValue = clampQuantizationBits(parsed);

    setControlEdits((current) => ({ ...current, quantizationBits: true }));
    applyValidScenarioControls({
      ...scenarioControls,
      quantizationBits: nextValue,
    });
  }

  function handleBatchSizeChange(rawValue: string) {
    if (isCustomOverride) {
      setCustomInputDraft((current) => ({
        ...current,
        batchSize: rawValue,
      }));

      const validation = validateCustomBatchSize(rawValue);
      if (validation.kind === "invalid") {
        setCustomFieldErrors((current) => ({
          ...current,
          batchSize: validation.message,
        }));
        return;
      }

      setCustomFieldErrors((current) => ({
        ...current,
        batchSize: undefined,
      }));
      setControlEdits((current) => ({ ...current, batchSize: true }));
      applyValidScenarioControls({
        ...scenarioControls,
        batchSize: validation.value,
      });
      return;
    }

    const parsed = parsePositiveNumberInput(rawValue);
    if (parsed == null) {
      return;
    }

    const nextValue = clampBatchSize(parsed);

    setControlEdits((current) => ({ ...current, batchSize: true }));
    applyValidScenarioControls({
      ...scenarioControls,
      batchSize: nextValue,
    });
  }

  return (
    <div className={className} data-roofline-throughput-explorer="explorer">
      <div
        className="mb-4 flex flex-col gap-4"
        data-roofline-control-layout="controls"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          {hasPresets ? (
            <div
              className="flex min-w-0 flex-1 flex-col gap-1.5"
              data-roofline-control-region="preset"
            >
              <label
                htmlFor="roofline-model-preset"
                className="text-sm font-medium text-foreground"
              >
                {ROOFLINE_MODEL_PRESET_CONTROL_LABEL}
              </label>
              <select
                id="roofline-model-preset"
                data-testid="roofline-model-preset"
                className={`${CONTROL_INPUT_CLASSNAME} w-full min-w-0`}
                value={presetSelection.selectedPresetId ?? ""}
                onChange={(event) => handlePresetChange(event.target.value)}
              >
                {presets.map((preset) => (
                  <option key={preset.modelId} value={preset.modelId}>
                    {preset.label}
                  </option>
                ))}
                <option value={ROOFLINE_CUSTOM_OVERRIDE_PRESET_ID}>
                  {ROOFLINE_CUSTOM_OVERRIDE_PRESET_LABEL}
                </option>
              </select>
            </div>
          ) : (
            <p
              className="text-sm text-muted-foreground"
              data-roofline-throughput-explorer="empty-presets"
              data-roofline-control-region="empty-presets"
              role="status"
            >
              {ROOFLINE_EMPTY_PRESETS_MESSAGE}
            </p>
          )}

          {selectedPreset && !isCustomOverride ? (
            <p
              className="min-w-0 text-sm text-muted-foreground sm:text-right"
              data-roofline-control-region="selected-model"
              data-selected-model-label={selectedPreset.label}
            >
              Selected model:{" "}
              <span className="font-medium text-foreground">
                {selectedPreset.label}
              </span>
            </p>
          ) : null}

          {isCustomOverride ? (
            <p
              className="min-w-0 text-sm text-muted-foreground sm:text-right"
              data-roofline-control-region="custom-override"
              data-roofline-throughput-explorer="custom-override"
              role="status"
            >
              Custom scenario values drive the chart.
            </p>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div
            className="flex min-w-0 flex-col gap-2"
            data-roofline-control-region="active-weight"
          >
            <div className="flex items-baseline justify-between gap-3">
              <label
                htmlFor="roofline-active-weight-size"
                className="text-sm font-medium text-foreground"
              >
                {ROOFLINE_ACTIVE_WEIGHT_SIZE_CONTROL_LABEL}
              </label>
              <output
                htmlFor="roofline-active-weight-size"
                className="shrink-0 text-sm font-medium text-foreground tabular-nums"
                data-active-weight-size-billions={
                  scenarioControls.activeWeightSizeBillions
                }
              >
                {formatActiveWeightSizeBillions(
                  scenarioControls.activeWeightSizeBillions,
                )}
                B
              </output>
            </div>
            {isCustomOverride ? (
              <input
                id="roofline-active-weight-size"
                data-testid="roofline-active-weight-size"
                type="number"
                inputMode="decimal"
                className={`${CONTROL_INPUT_CLASSNAME} w-full min-w-0`}
                min={activeWeightBounds.minBillions}
                max={activeWeightBounds.maxBillions}
                step={ROOFLINE_ACTIVE_WEIGHT_SIZE_SLIDER_STEP_BILLIONS}
                value={customInputDraft.activeWeightSizeBillions}
                onChange={(event) =>
                  handleCustomActiveWeightChange(event.target.value)
                }
                aria-invalid={
                  customFieldErrors.activeWeightSizeBillions != null
                }
                aria-describedby={
                  customFieldErrors.activeWeightSizeBillions
                    ? "roofline-active-weight-size-error"
                    : undefined
                }
              />
            ) : (
              <input
                id="roofline-active-weight-size"
                data-testid="roofline-active-weight-size"
                type="range"
                className="w-full accent-primary"
                min={activeWeightBounds.minBillions}
                max={activeWeightBounds.maxBillions}
                step={ROOFLINE_ACTIVE_WEIGHT_SIZE_SLIDER_STEP_BILLIONS}
                value={scenarioControls.activeWeightSizeBillions}
                onChange={(event) =>
                  handleActiveWeightSliderChange(event.target.value)
                }
              />
            )}
            {customFieldErrors.activeWeightSizeBillions ? (
              <p
                id="roofline-active-weight-size-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {customFieldErrors.activeWeightSizeBillions}
              </p>
            ) : null}
          </div>

          <div
            className="flex min-w-0 flex-col gap-1.5"
            data-roofline-control-region="quantization-bits"
          >
            <label
              htmlFor="roofline-quantization-bits"
              className="text-sm font-medium text-foreground"
            >
              {ROOFLINE_QUANTIZATION_BITS_CONTROL_LABEL}
            </label>
            <input
              id="roofline-quantization-bits"
              data-testid="roofline-quantization-bits"
              type="number"
              className={`${CONTROL_INPUT_CLASSNAME} w-full min-w-0`}
              min={ROOFLINE_QUANTIZATION_BITS_MIN}
              max={ROOFLINE_QUANTIZATION_BITS_MAX}
              step={ROOFLINE_QUANTIZATION_BITS_STEP}
              value={
                isCustomOverride
                  ? customInputDraft.quantizationBits
                  : scenarioControls.quantizationBits
              }
              onChange={(event) =>
                handleQuantizationBitsChange(event.target.value)
              }
              aria-invalid={customFieldErrors.quantizationBits != null}
              aria-describedby={
                customFieldErrors.quantizationBits
                  ? "roofline-quantization-bits-error"
                  : undefined
              }
            />
            {customFieldErrors.quantizationBits ? (
              <p
                id="roofline-quantization-bits-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {customFieldErrors.quantizationBits}
              </p>
            ) : null}
          </div>

          <div
            className="flex min-w-0 flex-col gap-1.5"
            data-roofline-control-region="batch-size"
          >
            <label
              htmlFor="roofline-batch-size"
              className="text-sm font-medium text-foreground"
            >
              {ROOFLINE_BATCH_SIZE_CONTROL_LABEL}
            </label>
            <input
              id="roofline-batch-size"
              data-testid="roofline-batch-size"
              type="number"
              className={`${CONTROL_INPUT_CLASSNAME} w-full min-w-0`}
              min={ROOFLINE_BATCH_SIZE_MIN}
              max={ROOFLINE_BATCH_SIZE_MAX}
              step={ROOFLINE_BATCH_SIZE_STEP}
              value={
                isCustomOverride
                  ? customInputDraft.batchSize
                  : scenarioControls.batchSize
              }
              onChange={(event) => handleBatchSizeChange(event.target.value)}
              aria-invalid={customFieldErrors.batchSize != null}
              aria-describedby={
                customFieldErrors.batchSize
                  ? "roofline-batch-size-error"
                  : undefined
              }
            />
            {customFieldErrors.batchSize ? (
              <p
                id="roofline-batch-size-error"
                className="text-sm text-destructive"
                role="alert"
              >
                {customFieldErrors.batchSize}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {chartModel.kind === "invalid" ? (
        <div data-roofline-throughput-explorer="invalid" role="alert">
          <p className="text-sm text-destructive">
            Roofline scenario inputs are incomplete or invalid.
          </p>
        </div>
      ) : (
        <div
          data-decode-tokens-per-second={String(
            chartModel.activePoint.decodeTokensPerSecond,
          )}
          data-roofline-boundary-point-count={String(
            visibleBoundaryData.length,
          )}
          data-roofline-boundary-y-max={String(
            visibleBoundaryMaxComputeFlopsPerSecond,
          )}
          data-roofline-throughput-explorer="chart"
          data-roofline-x-domain-max={String(
            (visibleXDomain ?? chartModel.xDomain)[1],
          )}
          data-roofline-y-domain-max={String(
            (visibleYDomain ?? chartModel.yDomain)[1],
          )}
        >
          <GraphFrame
            axisLabelX={ROOFLINE_THROUGHPUT_EXPLORER_AXIS_X}
            axisLabelY={ROOFLINE_THROUGHPUT_EXPLORER_AXIS_Y}
            chartLabel={ROOFLINE_THROUGHPUT_EXPLORER_CHART_LABEL}
            frameAxisLabels={false}
            legend={[
              {
                color: ROOFLINE_THROUGHPUT_BOUNDARY_COLOR,
                label: ROOFLINE_THROUGHPUT_BOUNDARY_LEGEND_LABEL,
              },
              ...chartModel.hostPoints
                .filter((host) => visibleHostIds.has(host.id))
                .map((host) => ({
                  active: true,
                  color: host.color,
                  label: host.label,
                  onToggle: () => toggleVisibleHost(host.id),
                })),
            ]}
            legendTestId="roofline-throughput-explorer"
            body={
              <div className="relative">
                <div className="flex justify-end border-b border-border/70 bg-card/35 px-3 py-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-2.5 text-sm font-medium text-foreground shadow-xs outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      data-testid="roofline-compute-host-dropdown"
                    >
                      <Cpu className="size-4 text-muted-foreground" />
                      <span>Compute hosts</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {visibleHostCount}/
                        {ROOFLINE_COMPUTE_HOST_PRESETS.length}
                      </span>
                      <ChevronDown className="size-4 text-muted-foreground" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-72"
                      sideOffset={8}
                    >
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>
                          Visible compute hosts
                        </DropdownMenuLabel>
                        {chartModel.hostPoints.map((host) => (
                          <DropdownMenuCheckboxItem
                            key={host.id}
                            checked={visibleHostIds.has(host.id)}
                            onCheckedChange={(checked) =>
                              setVisibleHost(host.id, checked)
                            }
                          >
                            <span
                              aria-hidden="true"
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: host.color }}
                            />
                            <span className="min-w-0 flex-1 truncate">
                              {host.label}
                            </span>
                            <span className="ml-auto shrink-0 text-xs text-muted-foreground tabular-nums">
                              {formatRooflineBandwidthGbps(
                                host.memoryBandwidthGbps,
                              )}{" "}
                              GB/s
                            </span>
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <ChartContainer
                  config={ROOFLINE_CHART_CONFIG}
                  className="h-[22rem] rounded-none border-0 border-b border-border/70 shadow-none"
                >
                  <Recharts.ComposedChart
                    accessibilityLayer
                    data={[...visibleBoundaryData]}
                    margin={{ top: 20, right: 24, bottom: 46, left: 46 }}
                  >
                    <Recharts.ReferenceLine
                      x={chartModel.xDomain[0]}
                      stroke="var(--border)"
                      strokeDasharray="4 4"
                    />
                    <Recharts.XAxis
                      allowDataOverflow
                      dataKey="memoryBandwidthGbps"
                      type="number"
                      domain={[...(visibleXDomain ?? chartModel.xDomain)]}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      stroke={AXIS_STROKE}
                      tick={{ fill: AXIS_TICK_FILL, fontSize: 12 }}
                      tickFormatter={(value) =>
                        formatRooflineBandwidthGbps(Number(value))
                      }
                      label={{
                        value: ROOFLINE_THROUGHPUT_EXPLORER_AXIS_X,
                        position: "insideBottom",
                        offset: -24,
                        fill: AXIS_TICK_FILL,
                        fontSize: 12,
                      }}
                    />
                    <Recharts.YAxis
                      allowDataOverflow
                      domain={[...(visibleYDomain ?? chartModel.yDomain)]}
                      scale="log"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      width={68}
                      stroke={AXIS_STROKE}
                      tick={{ fill: AXIS_TICK_FILL, fontSize: 12 }}
                      tickFormatter={(value) =>
                        formatRooflineFlopsPerSecond(Number(value))
                      }
                      label={{
                        value: ROOFLINE_THROUGHPUT_EXPLORER_AXIS_Y,
                        angle: -90,
                        position: "insideLeft",
                        offset: -34,
                        fill: AXIS_TICK_FILL,
                        fontSize: 12,
                        textAnchor: "middle",
                      }}
                    />
                    <ChartTooltip
                      cursor={{
                        stroke: "var(--border)",
                        strokeDasharray: "4 4",
                      }}
                      content={<RooflineBoundaryTooltipContent />}
                    />
                    <Recharts.Line
                      type="monotone"
                      dataKey="boundaryComputeFlopsPerSecond"
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
                    {visibleGuidePoints.map((point) => (
                      <Recharts.ReferenceDot
                        key={point.maximumDecodeTokensPerSecond}
                        x={point.memoryBandwidthGbps}
                        y={point.boundaryComputeFlopsPerSecond}
                        r={4}
                        fill="var(--background)"
                        stroke={ROOFLINE_THROUGHPUT_BOUNDARY_COLOR}
                        strokeWidth={2}
                        shape={(dotProps) => {
                          const cx = dotProps.cx ?? 0;
                          const cy = dotProps.cy ?? 0;
                          const radius = Number(dotProps.r ?? 0);

                          return (
                            <g data-roofline-throughput-guide={point.label}>
                              <circle
                                cx={cx}
                                cy={cy}
                                r={radius}
                                fill="var(--background)"
                                pointerEvents="none"
                                stroke={ROOFLINE_THROUGHPUT_BOUNDARY_COLOR}
                                strokeWidth={2}
                              />
                              <text
                                x={cx + 8}
                                y={cy + 4}
                                fill="var(--foreground)"
                                fontSize={10}
                                fontWeight={700}
                                paintOrder="stroke"
                                pointerEvents="none"
                                stroke="var(--background)"
                                strokeLinejoin="round"
                                strokeWidth={3}
                              >
                                {point.label}
                              </text>
                            </g>
                          );
                        }}
                      />
                    ))}
                    {chartModel.hostPoints
                      .filter((host) => visibleHostIds.has(host.id))
                      .map((host) => (
                        <Recharts.ReferenceDot
                          key={host.id}
                          x={host.memoryBandwidthGbps}
                          y={host.computeFlopsPerSecond}
                          r={5.5}
                          fill={host.color}
                          stroke="var(--background)"
                          strokeWidth={2}
                          shape={(dotProps) => {
                            const cx = dotProps.cx ?? 0;
                            const cy = dotProps.cy ?? 0;
                            const radius = Number(dotProps.r ?? 0);
                            const labelX = cx + 9;
                            const labelY = cy - 8;
                            const pointLabel = `${host.label} (${formatRooflineDecodeTokensPerSecond(
                              host.maximumDecodeTokensPerSecond,
                            )})`;

                            return (
                              // biome-ignore lint/a11y/useSemanticElements: SVG chart marks cannot render HTML button elements.
                              <g
                                aria-label={`${host.label} maximum decode ${formatRooflineDecodeTokensPerSecond(
                                  host.maximumDecodeTokensPerSecond,
                                )} tokens per second`}
                                role="button"
                                tabIndex={0}
                                onBlur={() => setHostTooltip(null)}
                                onFocus={(event) =>
                                  showHostTooltip(host, event)
                                }
                                onMouseEnter={(event) =>
                                  showHostTooltip(host, event)
                                }
                                onMouseLeave={() => setHostTooltip(null)}
                                onMouseOut={() => setHostTooltip(null)}
                                onMouseOver={(event) =>
                                  showHostTooltip(host, event)
                                }
                              >
                                <circle
                                  className="roofline-throughput-explorer__compute-host"
                                  cx={cx}
                                  cy={cy}
                                  r={radius}
                                  fill={dotProps.fill}
                                  stroke={dotProps.stroke}
                                  strokeWidth={dotProps.strokeWidth}
                                />
                                <text
                                  className="roofline-throughput-explorer__compute-host-label"
                                  data-roofline-host-label={host.id}
                                  x={labelX}
                                  y={labelY}
                                  fill="var(--foreground)"
                                  fontSize={10}
                                  fontWeight={600}
                                  paintOrder="stroke"
                                  pointerEvents="none"
                                  stroke="var(--background)"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                >
                                  {pointLabel}
                                </text>
                              </g>
                            );
                          }}
                        />
                      ))}
                  </Recharts.ComposedChart>
                </ChartContainer>
                {hostTooltip ? (
                  <div
                    className="pointer-events-none absolute z-10 min-w-48 rounded-lg border border-border bg-popover/95 px-3 py-2 text-sm text-popover-foreground shadow-lg backdrop-blur-sm"
                    data-roofline-host-tooltip={hostTooltip.host.id}
                    data-roofline-host-tooltip-placement={hostTooltip.placement}
                    style={{
                      left: hostTooltip.left,
                      top: hostTooltip.top,
                      transform:
                        hostTooltip.placement === "above"
                          ? "translate(-50%, calc(-100% - 0.5rem))"
                          : "translate(-50%, 0.75rem)",
                    }}
                  >
                    <div className="mb-1.5 flex items-center gap-2 font-medium">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: hostTooltip.host.color }}
                      />
                      <span>{hostTooltip.host.label}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-xs">
                      <span className="text-muted-foreground">Max decode</span>
                      <span className="font-medium tabular-nums">
                        {formatRooflineDecodeTokensPerSecond(
                          hostTooltip.host.maximumDecodeTokensPerSecond,
                        )}{" "}
                        tok/s
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-4 text-xs">
                      <span className="text-muted-foreground">Bandwidth</span>
                      <span className="font-medium tabular-nums">
                        {formatRooflineBandwidthGbps(
                          hostTooltip.host.memoryBandwidthGbps,
                        )}{" "}
                        GB/s
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-4 text-xs">
                      <span className="text-muted-foreground">FLOP/s</span>
                      <span className="font-medium tabular-nums">
                        {formatRooflineFlopsPerSecond(
                          hostTooltip.host.computeFlopsPerSecond,
                        )}{" "}
                        FLOP/s
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            }
          />
        </div>
      )}
    </div>
  );
}
