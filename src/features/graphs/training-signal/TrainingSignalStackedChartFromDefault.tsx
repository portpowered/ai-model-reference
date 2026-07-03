import { DEFAULT_TRAINING_SIGNAL_CHART_INPUT } from "@/features/graphs/training-signal/default-training-signal-timeline";
import { TrainingSignalStackedChart } from "@/features/graphs/training-signal/TrainingSignalStackedChart";

/** Build-time wrapper that renders the default conceptual training-signal timeline. */
export function TrainingSignalStackedChartFromDefault({
  caption,
}: {
  caption?: string;
}) {
  return (
    <TrainingSignalStackedChart
      caption={caption}
      chartInput={DEFAULT_TRAINING_SIGNAL_CHART_INPUT}
    />
  );
}
