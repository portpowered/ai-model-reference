import { TrainingSignalEvolutionTimeline } from "@/features/training-signal-evolution/TrainingSignalEvolutionTimeline";

/**
 * Blog embed for the LLM training-signal evolution timeline.
 * Uses static default stage data so MDX pages do not fetch at runtime.
 */
export function TrainingSignalEvolutionBlogVisual() {
  return <TrainingSignalEvolutionTimeline />;
}
