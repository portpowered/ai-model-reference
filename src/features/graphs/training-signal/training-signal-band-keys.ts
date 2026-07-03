export const TRAINING_SIGNAL_BAND_KEYS = [
  "pretrainingCorpus",
  "instructionSupervised",
  "preferenceSignal",
  "verifiableRl",
  "syntheticTraces",
  "onPolicyDistillation",
] as const;

export type TrainingSignalBandKey = (typeof TRAINING_SIGNAL_BAND_KEYS)[number];

export const TRAINING_SIGNAL_BAND_LABELS: Record<
  TrainingSignalBandKey,
  string
> = {
  pretrainingCorpus: "Broad pretraining corpus",
  instructionSupervised: "Instruction / supervised examples",
  preferenceSignal: "Preference signal",
  verifiableRl: "Verifiable RL tasks",
  syntheticTraces: "Synthetic / model-generated traces",
  onPolicyDistillation: "On-policy distillation / self-distillation",
};
