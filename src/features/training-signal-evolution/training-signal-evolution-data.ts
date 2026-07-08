import type { TrainingSignalEvolutionSurface } from "@/features/training-signal-evolution/training-signal-evolution-surface";

export const TRAINING_SIGNAL_EVOLUTION_VISUAL_ACCESSIBLE_NAME =
  "LLM training-signal evolution timeline";

export const TRAINING_SIGNAL_EVOLUTION_STAGE_ORDER = [
  "broad-web-pretraining",
  "few-shot-prompting",
  "instruction-tuning",
  "rlhf",
  "rlvr",
  "on-policy-distillation",
] as const;

export type TrainingSignalEvolutionStageId =
  (typeof TRAINING_SIGNAL_EVOLUTION_STAGE_ORDER)[number];

export type TrainingSignalEvolutionPhaseKind =
  | "pretraining"
  | "midTraining"
  | "postTraining"
  | "promptingAdaptation"
  | "onPolicyLoop";

export type TrainingSignalEvolutionStage = {
  id: TrainingSignalEvolutionStageId;
  label: string;
  descriptor: string;
  phaseKind: TrainingSignalEvolutionPhaseKind;
};

export type TrainingSignalEvolutionLegend = {
  pretraining: string;
  midTraining: string;
  postTraining: string;
  promptingAdaptation: string;
  onPolicyLoop: string;
};

export type TrainingSignalEvolutionVisualData = {
  surface: TrainingSignalEvolutionSurface;
  title: string;
  legend: TrainingSignalEvolutionLegend;
  stages: readonly TrainingSignalEvolutionStage[];
};

export const DEFAULT_TRAINING_SIGNAL_EVOLUTION_BLOG_DATA: TrainingSignalEvolutionVisualData =
  {
    surface: "training-signal-evolution-timeline",
    title: "How training signals evolved beyond the pretraining corpus",
    legend: {
      pretraining: "Pretraining",
      midTraining: "Mid-training",
      postTraining: "Post-training",
      promptingAdaptation: "Prompting-time adaptation",
      onPolicyLoop: "On-policy feedback loop",
    },
    stages: [
      {
        id: "broad-web-pretraining",
        label: "Broad web-scale pretraining",
        descriptor:
          "Models learn grammar, facts, and style by predicting the next token on large text corpora scraped from the open web. Most observable behavior at this stage comes from statistical patterns in public text rather than curated task examples.",
        phaseKind: "pretraining",
      },
      {
        id: "few-shot-prompting",
        label: "Few-shot prompting",
        descriptor:
          "Task examples placed in the prompt steer outputs at inference time without updating model weights. The visible training signal shifts through context, not through new stored supervision.",
        phaseKind: "promptingAdaptation",
      },
      {
        id: "instruction-tuning",
        label: "Instruction tuning",
        descriptor:
          "Curated instruction-and-response pairs teach models to follow tasks, answer questions, and adopt assistant-style formatting. Mid-training supervision adds a direct signal for helpful formatting that raw pretraining corpora rarely emphasize.",
        phaseKind: "midTraining",
      },
      {
        id: "rlhf",
        label: "Reinforcement learning from human feedback (RLHF)",
        descriptor:
          "Human reviewers compare candidate answers; ranked preferences train a reward model and refine the policy. Post-training preference signal steers tone, safety, and helpfulness through human judgment rather than next-token prediction alone.",
        phaseKind: "postTraining",
      },
      {
        id: "rlvr",
        label: "Reinforcement learning with verifiable rewards (RLVR)",
        descriptor:
          "Tasks with objectively checkable answers—such as code tests or math verification—supply automatic reward when outcomes pass validators. Post-training feedback targets skills where success can be scored without subjective ranking.",
        phaseKind: "postTraining",
      },
      {
        id: "on-policy-distillation",
        label: "On-policy distillation and self-distillation",
        descriptor:
          "The model generates its own candidate traces; filtered outputs re-enter training as teacher or student data. Observable signal increasingly comes from the model's current policy looped back into updates, not only from fixed human-written corpora.",
        phaseKind: "onPolicyLoop",
      },
    ],
  };

export function isTrainingSignalEvolutionStageId(
  value: string,
): value is TrainingSignalEvolutionStageId {
  return (TRAINING_SIGNAL_EVOLUTION_STAGE_ORDER as readonly string[]).includes(
    value,
  );
}

export function validateTrainingSignalEvolutionStages(
  stages: readonly TrainingSignalEvolutionStage[],
): { ok: true } | { ok: false; reason: "empty" | "order" | "duplicate" } {
  if (stages.length === 0) {
    return { ok: false, reason: "empty" };
  }

  const seen = new Set<string>();
  for (const stage of stages) {
    if (seen.has(stage.id)) {
      return { ok: false, reason: "duplicate" };
    }
    seen.add(stage.id);
  }

  const stageIds = stages.map((stage) => stage.id);
  const expectedPrefix = TRAINING_SIGNAL_EVOLUTION_STAGE_ORDER.slice(
    0,
    stageIds.length,
  );
  for (let index = 0; index < stageIds.length; index += 1) {
    if (stageIds[index] !== expectedPrefix[index]) {
      return { ok: false, reason: "order" };
    }
  }

  return { ok: true };
}
