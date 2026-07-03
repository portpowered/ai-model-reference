import type { TrainingSignalBandKey } from "@/features/graphs/training-signal/training-signal-band-keys";

export const TRAINING_SIGNAL_BAND_COLORS: Record<
  TrainingSignalBandKey,
  string
> = {
  pretrainingCorpus: "var(--primary)",
  instructionSupervised: "var(--accent)",
  preferenceSignal:
    "color-mix(in oklch, var(--accent) 45%, var(--primary) 55%)",
  verifiableRl: "var(--secondary-foreground)",
  syntheticTraces:
    "color-mix(in oklch, var(--secondary-foreground) 55%, var(--secondary) 45%)",
  onPolicyDistillation:
    "color-mix(in oklch, var(--primary) 35%, var(--accent) 65%)",
};
