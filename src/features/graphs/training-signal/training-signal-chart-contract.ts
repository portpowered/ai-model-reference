import {
  TRAINING_SIGNAL_BAND_KEYS,
  TRAINING_SIGNAL_BAND_LABELS,
  type TrainingSignalBandKey,
} from "@/features/graphs/training-signal/training-signal-band-keys";

export type TrainingSignalValueMode = "conceptual" | "quantitative";

export type TrainingSignalChartMetadata = {
  valueMode: TrainingSignalValueMode;
  quantitativeSource?: string;
};

export type TrainingSignalTimelinePointInput = {
  timeLabel: string;
  timeKey: string;
} & {
  [K in TrainingSignalBandKey]?: number | null | undefined;
};

export type TrainingSignalTimelinePoint = {
  timeLabel: string;
  timeKey: string;
} & Record<TrainingSignalBandKey, number>;

export type TrainingSignalChartInput = {
  timeline: readonly TrainingSignalTimelinePointInput[];
  metadata?: TrainingSignalChartMetadata | null;
};

export type TrainingSignalChartLabeling = {
  accessibleBandNames: readonly string[];
  accessibleDescription: string;
  accessibleName: string;
  statusText: string;
  tooltipStatusHint: string;
  valueMode: TrainingSignalValueMode;
  yAxisLabel: string;
};

const TRAINING_SIGNAL_ACCESSIBLE_BAND_NAMES = TRAINING_SIGNAL_BAND_KEYS.map(
  (bandKey) => TRAINING_SIGNAL_BAND_LABELS[bandKey],
);

export type ResolvedTrainingSignalChart = {
  labeling: TrainingSignalChartLabeling;
  metadata: TrainingSignalChartMetadata;
  timeline: readonly TrainingSignalTimelinePoint[];
};

export type TrainingSignalChartResolution =
  | {
      status: "ready";
      chart: ResolvedTrainingSignalChart;
    }
  | {
      status: "empty";
      reason: string;
    }
  | {
      status: "error";
      issues: readonly string[];
    };

const DEFAULT_METADATA: TrainingSignalChartMetadata = {
  valueMode: "conceptual",
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function buildLabeling(
  metadata: TrainingSignalChartMetadata,
): TrainingSignalChartLabeling {
  if (metadata.valueMode === "quantitative") {
    const sourceLabel =
      metadata.quantitativeSource?.trim() || "unspecified source";
    return {
      accessibleBandNames: TRAINING_SIGNAL_ACCESSIBLE_BAND_NAMES,
      accessibleDescription:
        "Stacked training-signal chart with sourced quantitative values over time.",
      accessibleName: "LLM training-signal shift chart",
      statusText: `Quantitative values from ${sourceLabel}.`,
      tooltipStatusHint: `Values from ${sourceLabel}`,
      valueMode: "quantitative",
      yAxisLabel: "Relative signal mix",
    };
  }

  return {
    accessibleBandNames: TRAINING_SIGNAL_ACCESSIBLE_BAND_NAMES,
    accessibleDescription:
      "Conceptual stacked bands showing how training-signal mix shifts over time. Values are illustrative, not measured percentages.",
    accessibleName: "LLM training-signal shift chart",
    statusText:
      "Conceptual illustration — values are illustrative, not measured data.",
    tooltipStatusHint: "Illustrative values",
    valueMode: "conceptual",
    yAxisLabel: "Relative signal mix (illustrative)",
  };
}

export function formatTrainingSignalValue(
  value: number,
  valueMode: TrainingSignalValueMode,
): string {
  const rounded = Math.round(value * 10) / 10;
  if (valueMode === "conceptual") {
    return `${rounded} (illustrative)`;
  }

  return `${rounded}%`;
}

export function resolveTrainingSignalChart(
  input: TrainingSignalChartInput,
): TrainingSignalChartResolution {
  const issues: string[] = [];

  if (!input.timeline?.length) {
    return {
      status: "empty",
      reason: "No timeline points were provided for the training-signal chart.",
    };
  }

  const metadata = input.metadata ?? DEFAULT_METADATA;

  if (metadata.valueMode === "quantitative") {
    const source = metadata.quantitativeSource?.trim();
    if (!source) {
      issues.push(
        "Quantitative charts require metadata.quantitativeSource with a non-empty source label.",
      );
    }
  }

  const timeline: TrainingSignalTimelinePoint[] = [];

  for (const [index, point] of input.timeline.entries()) {
    if (!point.timeLabel?.trim()) {
      issues.push(`Timeline point ${index + 1} is missing a time label.`);
    }
    if (!point.timeKey?.trim()) {
      issues.push(`Timeline point ${index + 1} is missing a stable time key.`);
    }

    const resolvedPoint = {
      timeLabel: point.timeLabel,
      timeKey: point.timeKey,
    } as TrainingSignalTimelinePoint;

    for (const bandKey of TRAINING_SIGNAL_BAND_KEYS) {
      const value = point[bandKey];
      if (!isFiniteNumber(value)) {
        issues.push(
          `Timeline point ${index + 1} (${point.timeKey || "unknown"}) is missing a numeric value for ${bandKey}.`,
        );
        continue;
      }
      if (value < 0) {
        issues.push(
          `Timeline point ${index + 1} (${point.timeKey}) has a negative value for ${bandKey}.`,
        );
      }
      resolvedPoint[bandKey] = value;
    }

    timeline.push(resolvedPoint);
  }

  if (issues.length > 0) {
    return {
      status: "error",
      issues,
    };
  }

  return {
    status: "ready",
    chart: {
      labeling: buildLabeling(metadata),
      metadata,
      timeline,
    },
  };
}
