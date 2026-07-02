import {
  TRAINING_SIGNAL_BAND_KEYS,
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
} & Partial<Record<TrainingSignalBandKey, number | null | undefined>>;

export type TrainingSignalTimelinePoint = {
  timeLabel: string;
  timeKey: string;
} & Record<TrainingSignalBandKey, number>;

export type TrainingSignalChartInput = {
  timeline: readonly TrainingSignalTimelinePointInput[];
  metadata?: TrainingSignalChartMetadata | null;
};

export type TrainingSignalChartLabeling = {
  accessibleDescription: string;
  accessibleName: string;
  statusText: string;
  valueMode: TrainingSignalValueMode;
  yAxisLabel: string;
};

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
      accessibleDescription:
        "Stacked training-signal chart with sourced quantitative values over time.",
      accessibleName: "LLM training-signal shift chart",
      statusText: `Quantitative values from ${sourceLabel}.`,
      valueMode: "quantitative",
      yAxisLabel: "Relative signal mix",
    };
  }

  return {
    accessibleDescription:
      "Conceptual stacked bands showing how training-signal mix shifts over time. Values are illustrative, not measured percentages.",
    accessibleName: "LLM training-signal shift chart",
    statusText:
      "Conceptual illustration — values are illustrative, not measured data.",
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
