"use client";

import { TrainingSignalStackedAreaGraph } from "@/features/graphs/training-signal/TrainingSignalStackedAreaGraph";
import {
  TRAINING_SIGNAL_BAND_KEYS,
  TRAINING_SIGNAL_BAND_LABELS,
} from "@/features/graphs/training-signal/training-signal-band-keys";
import {
  formatTrainingSignalValue,
  resolveTrainingSignalChart,
  type TrainingSignalChartInput,
} from "@/features/graphs/training-signal/training-signal-chart-contract";

function TrainingSignalChartEmptyState({ reason }: { reason: string }) {
  return (
    <section
      aria-labelledby="training-signal-chart-empty-title"
      className="rounded-xl border border-border/70 bg-card/55 px-4 py-5"
      data-training-signal-chart="empty"
    >
      <h2
        className="text-base font-semibold text-foreground"
        id="training-signal-chart-empty-title"
      >
        Training-signal chart unavailable
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{reason}</p>
    </section>
  );
}

function TrainingSignalChartErrorState({
  issues,
}: {
  issues: readonly string[];
}) {
  return (
    <section
      aria-labelledby="training-signal-chart-error-title"
      className="rounded-xl border border-destructive/40 bg-card/55 px-4 py-5"
      data-training-signal-chart="error"
    >
      <h2
        className="text-base font-semibold text-foreground"
        id="training-signal-chart-error-title"
      >
        Training-signal chart data is incomplete
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {issues.map((issue) => (
          <li key={issue}>{issue}</li>
        ))}
      </ul>
    </section>
  );
}

export function TrainingSignalStackedChart({
  caption,
  chartInput,
  className,
  dataTestId = "training-signal-stacked-chart",
}: {
  caption?: string;
  chartInput: TrainingSignalChartInput;
  className?: string;
  dataTestId?: string;
}) {
  const resolution = resolveTrainingSignalChart(chartInput);

  if (resolution.status === "empty") {
    return <TrainingSignalChartEmptyState reason={resolution.reason} />;
  }

  if (resolution.status === "error") {
    return <TrainingSignalChartErrorState issues={resolution.issues} />;
  }

  const { chart } = resolution;
  const { labeling, metadata, timeline } = chart;
  const titleId = `${dataTestId}-title`;
  const statusId = `${dataTestId}-status`;
  const descriptionId = `${dataTestId}-description`;
  const bandsSummaryId = `${dataTestId}-bands-summary`;
  const describedByIds = [descriptionId, statusId, bandsSummaryId].join(" ");

  return (
    <figure
      aria-describedby={describedByIds}
      aria-labelledby={titleId}
      className={className}
      data-testid={dataTestId}
      data-training-signal-chart="ready"
      data-value-mode={metadata.valueMode}
    >
      <div className="space-y-3">
        <p
          className="text-sm font-medium text-muted-foreground"
          data-training-signal-status="true"
          id={statusId}
        >
          {labeling.statusText}
        </p>

        <div className="sr-only" id={descriptionId}>
          <p>{labeling.accessibleDescription}</p>
        </div>

        <ul className="sr-only" id={bandsSummaryId}>
          {labeling.accessibleBandNames.map((bandName) => (
            <li key={bandName}>{bandName}</li>
          ))}
        </ul>

        <TrainingSignalStackedAreaGraph
          chartTitleId={titleId}
          dataTestId={dataTestId}
          labeling={labeling}
          metadata={metadata}
          timeline={timeline}
        />

        <table className="sr-only">
          <caption>{labeling.accessibleName}</caption>
          <thead>
            <tr>
              <th scope="col">Time</th>
              {TRAINING_SIGNAL_BAND_KEYS.map((bandKey) => (
                <th key={bandKey} scope="col">
                  {TRAINING_SIGNAL_BAND_LABELS[bandKey]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeline.map((point) => (
              <tr key={point.timeKey}>
                <th scope="row">{point.timeLabel}</th>
                {TRAINING_SIGNAL_BAND_KEYS.map((bandKey) => (
                  <td key={bandKey}>
                    {formatTrainingSignalValue(
                      point[bandKey],
                      metadata.valueMode,
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {caption ? (
        <figcaption className="mt-3 text-sm">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
