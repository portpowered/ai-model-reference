import type { TrainingSignalChartInput } from "@/features/graphs/training-signal/training-signal-chart-contract";

export const DEFAULT_TRAINING_SIGNAL_CHART_INPUT = {
  metadata: {
    valueMode: "conceptual",
  },
  timeline: [
    {
      timeKey: "era-1",
      timeLabel: "Early LLM era",
      pretrainingCorpus: 88,
      instructionSupervised: 8,
      preferenceSignal: 2,
      verifiableRl: 1,
      syntheticTraces: 0.5,
      onPolicyDistillation: 0.5,
    },
    {
      timeKey: "era-2",
      timeLabel: "Instruction-tuning wave",
      pretrainingCorpus: 62,
      instructionSupervised: 24,
      preferenceSignal: 8,
      verifiableRl: 3,
      syntheticTraces: 2,
      onPolicyDistillation: 1,
    },
    {
      timeKey: "era-3",
      timeLabel: "Modern post-training mix",
      pretrainingCorpus: 38,
      instructionSupervised: 20,
      preferenceSignal: 14,
      verifiableRl: 12,
      syntheticTraces: 9,
      onPolicyDistillation: 7,
    },
  ],
} as const satisfies TrainingSignalChartInput;
