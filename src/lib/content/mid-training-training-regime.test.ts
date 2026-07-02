import { describe, expect, test } from "bun:test";
import { loadTrainingRegimePage } from "@/lib/content/training-regime-page";

describe("mid-training training-regime boundary contracts", () => {
  test("compared-to-nearby-regimes prose distinguishes pretraining, post-training, SFT, domain adaptation, and distillation", async () => {
    const page = await loadTrainingRegimePage("mid-training");
    const nearby = page.messages.sections?.comparedToNearbyRegimes.body ?? "";

    expect(nearby).toContain("Broad pretraining");
    expect(nearby).toContain("large, general corpora");
    expect(nearby).toContain("pretrained checkpoint");
    expect(nearby).toContain("Post-training");
    expect(nearby).toContain("instruction following");
    expect(nearby).toContain("assistant-shaping");
    expect(nearby).toContain("Instruction tuning");
    expect(nearby).toContain("supervised fine-tuning");
    expect(nearby).toContain("prompt-and-answer demonstrations");
    expect(nearby).toContain("Domain adaptation");
    expect(nearby).toContain("Distillation");
    expect(nearby).toContain("teacher model");
    expect(nearby).toContain("does not require a teacher");
  });
});
