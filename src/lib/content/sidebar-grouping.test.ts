import { describe, expect, test } from "bun:test";
import {
  getSidebarGroupIdsForSection,
  getSidebarGroupingSectionsForKind,
  SIDEBAR_GROUP_LABELS,
  SIDEBAR_GROUPING_PRECEDENCE,
} from "./sidebar-grouping";

describe("sidebar grouping contract", () => {
  test("documents derived taxonomy before editorial sidebar grouping", () => {
    expect(SIDEBAR_GROUPING_PRECEDENCE).toEqual([
      "derived-taxonomy",
      "editorial-sidebar-grouping",
    ]);
  });

  test("limits concept records to glossary and concepts sections", () => {
    expect(getSidebarGroupingSectionsForKind("concept")).toEqual([
      "glossary",
      "concepts",
    ]);
  });

  test("exposes stable subgroup labels for module navigation", () => {
    expect(getSidebarGroupIdsForSection("modules")).toEqual([
      "attention-foundations",
      "attention-variants",
      "feed-forward-and-activation",
      "normalization",
      "positional-and-sequence-encoding",
    ]);
    expect(SIDEBAR_GROUP_LABELS.modules["attention-foundations"]).toBe(
      "Attention Foundations",
    );
  });

  test("exposes stable subgroup labels for training navigation", () => {
    expect(getSidebarGroupIdsForSection("training")).toEqual([
      "pretraining",
      "alignment",
      "post-training",
      "distillation",
      "optimization",
    ]);
    expect(SIDEBAR_GROUP_LABELS.training.pretraining).toBe("Pretraining");
  });
});
