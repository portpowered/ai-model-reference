import type { GenerationEvolutionSurface } from "@/features/generation-evolution/generation-evolution-surface";

export const GENERATION_EVOLUTION_STAGE_ORDER = [
  "unet-denoising",
  "diffusion-transformer-denoising",
  "flow-matching",
  "open-world-video-generation",
] as const;

export type GenerationEvolutionStageId =
  (typeof GENERATION_EVOLUTION_STAGE_ORDER)[number];

export type GenerationEvolutionChangeKind =
  | "architecture"
  | "objective"
  | "domain";

export type GenerationEvolutionStage = {
  id: GenerationEvolutionStageId;
  label: string;
  descriptor: string;
  changeKind: GenerationEvolutionChangeKind;
};

export type GenerationEvolutionLegend = {
  architecture: string;
  objective: string;
  domain: string;
};

export type GenerationEvolutionVisualData = {
  surface: GenerationEvolutionSurface;
  title: string;
  legend: GenerationEvolutionLegend;
  stages: readonly GenerationEvolutionStage[];
};

export const DEFAULT_GENERATION_EVOLUTION_BLOG_DATA: GenerationEvolutionVisualData =
  {
    surface: "generation-evolution-timeline",
    title: "How diffusion generation stacks evolved",
    legend: {
      architecture: "Denoiser backbone",
      objective: "Training or sampling objective",
      domain: "Output modality or scope",
    },
    stages: [
      {
        id: "unet-denoising",
        label: "U-Net denoising",
        descriptor:
          "Convolutional U-Net denoisers operate in image or latent space over many discrete steps.",
        changeKind: "architecture",
      },
      {
        id: "diffusion-transformer-denoising",
        label: "Diffusion transformer denoising",
        descriptor:
          "Transformer blocks replace the U-Net backbone while keeping iterative denoising schedules.",
        changeKind: "architecture",
      },
      {
        id: "flow-matching",
        label: "Flow-matching generation",
        descriptor:
          "Continuous flow or flow-matching objectives learn straighter paths between noise and data.",
        changeKind: "objective",
      },
      {
        id: "open-world-video-generation",
        label: "Open-world and video generation",
        descriptor:
          "Systems scale to longer horizons, video frames, and broader world-model generation domains.",
        changeKind: "domain",
      },
    ],
  };

export function isGenerationEvolutionStageId(
  value: string,
): value is GenerationEvolutionStageId {
  return (GENERATION_EVOLUTION_STAGE_ORDER as readonly string[]).includes(
    value,
  );
}

export function validateGenerationEvolutionStages(
  stages: readonly GenerationEvolutionStage[],
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
  const expectedPrefix = GENERATION_EVOLUTION_STAGE_ORDER.slice(
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
