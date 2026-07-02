import { describe, expect, test } from "bun:test";
import {
  DEFAULT_GENERATION_EVOLUTION_BLOG_DATA,
  GENERATION_EVOLUTION_STAGE_ORDER,
  isGenerationEvolutionStageId,
  validateGenerationEvolutionStages,
} from "@/features/generation-evolution/generation-evolution-data";
import { GENERATION_EVOLUTION_SURFACE } from "@/features/generation-evolution/generation-evolution-surface";

describe("generation evolution data contract", () => {
  test("names the four required stages in stable order", () => {
    expect(GENERATION_EVOLUTION_STAGE_ORDER).toEqual([
      "unet-denoising",
      "diffusion-transformer-denoising",
      "flow-matching",
      "open-world-video-generation",
    ]);
    expect(
      DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.stages.map((stage) => stage.id),
    ).toEqual([...GENERATION_EVOLUTION_STAGE_ORDER]);
  });

  test("ships default blog data without client-side fetching", () => {
    expect(DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.surface).toBe(
      GENERATION_EVOLUTION_SURFACE,
    );
    expect(DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.title.length).toBeGreaterThan(
      0,
    );
    expect(
      DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.legend.architecture.length,
    ).toBeGreaterThan(0);
    expect(DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.stages).toHaveLength(4);
    for (const stage of DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.stages) {
      expect(stage.label.length).toBeGreaterThan(0);
      expect(stage.descriptor.length).toBeGreaterThan(0);
      expect(isGenerationEvolutionStageId(stage.id)).toBe(true);
    }
  });

  test("rejects out-of-order or duplicate stage ids", () => {
    expect(
      validateGenerationEvolutionStages(
        DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.stages,
      ),
    ).toEqual({ ok: true });

    expect(validateGenerationEvolutionStages([])).toEqual({
      ok: false,
      reason: "empty",
    });

    expect(
      validateGenerationEvolutionStages([
        DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.stages[1],
        DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.stages[0],
      ]),
    ).toEqual({ ok: false, reason: "order" });

    expect(
      validateGenerationEvolutionStages([
        DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.stages[0],
        DEFAULT_GENERATION_EVOLUTION_BLOG_DATA.stages[0],
      ]),
    ).toEqual({ ok: false, reason: "duplicate" });
  });
});
