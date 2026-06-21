import { describe, expect, test } from "bun:test";
import {
  getSidebarGroupIdsForSection,
  getSidebarGroupingSectionsForKind,
  resolveConceptsSidebarGroupWithSource,
  resolveGlossarySidebarGroupWithSource,
  resolveModulesSidebarGroupWithSource,
  resolveSystemsSidebarGroupWithSource,
  resolveTrainingSidebarGroupWithSource,
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

  test("derives covered module groups from ontology membership before compatibility fallback", () => {
    expect(
      resolveModulesSidebarGroupWithSource({
        primaryClassificationId: "classification.module.feed-forward",
        moduleType: "feed-forward",
      }),
    ).toEqual({
      groupId: "feed-forward-and-activation",
      source: "derived-taxonomy",
    });
    expect(
      resolveModulesSidebarGroupWithSource({
        primaryClassificationId: "classification.module.attention",
        moduleType: "attention",
      }),
    ).toEqual({
      groupId: "attention-variants",
      source: "derived-taxonomy",
    });
    expect(
      resolveModulesSidebarGroupWithSource({
        primaryClassificationId: "classification.module.attention",
        moduleType: "attention",
        sidebarGrouping: {
          modules: "attention-foundations",
        },
      }),
    ).toEqual({
      groupId: "attention-foundations",
      source: "editorial-sidebar-grouping",
    });
    expect(
      resolveModulesSidebarGroupWithSource({
        primaryClassificationId: "classification.module.attention.multi-head",
        secondaryClassificationIds: ["classification.module.attention"],
        moduleType: "attention",
        sidebarGrouping: {
          modules: "attention-foundations",
        },
      }),
    ).toEqual({
      groupId: "attention-variants",
      source: "derived-taxonomy",
    });
  });

  test("derives training and system groups from ontology when the branch is modeled", () => {
    expect(
      resolveTrainingSidebarGroupWithSource({
        primaryClassificationId: "classification.training.alignment",
        regimeType: "alignment",
      }),
    ).toEqual({
      groupId: "alignment",
      source: "derived-taxonomy",
    });
    expect(
      resolveTrainingSidebarGroupWithSource({
        regimeType: "distillation",
      }),
    ).toEqual({
      groupId: "distillation",
      source: "editorial-sidebar-grouping",
    });

    expect(
      resolveSystemsSidebarGroupWithSource({
        primaryClassificationId: "classification.system.routing",
        systemType: "routing",
      }),
    ).toEqual({
      groupId: "routing",
      source: "derived-taxonomy",
    });
    expect(
      resolveSystemsSidebarGroupWithSource({
        systemType: "memory",
      }),
    ).toEqual({
      groupId: "memory",
      source: "editorial-sidebar-grouping",
    });
  });

  test("derives concept and glossary groups from ontology first, then explicit editorial fallback", () => {
    expect(
      resolveConceptsSidebarGroupWithSource({
        primaryClassificationId: "classification.concept.inference",
        conceptType: "inference",
      }),
    ).toEqual({
      groupId: "inference",
      source: "derived-taxonomy",
    });
    expect(
      resolveConceptsSidebarGroupWithSource({
        sidebarGrouping: {
          concepts: "long-context",
        },
      }),
    ).toEqual({
      groupId: "long-context",
      source: "editorial-sidebar-grouping",
    });

    expect(
      resolveGlossarySidebarGroupWithSource({
        primaryClassificationId: "classification.concept.math",
        conceptType: "math",
      }),
    ).toEqual({
      groupId: "math-and-training",
      source: "derived-taxonomy",
    });
    expect(
      resolveGlossarySidebarGroupWithSource({
        sidebarGrouping: {
          glossary: "sequence-and-attention",
        },
      }),
    ).toEqual({
      groupId: "sequence-and-attention",
      source: "editorial-sidebar-grouping",
    });
    expect(resolveGlossarySidebarGroupWithSource({})).toEqual({
      groupId: "model-taxonomy",
      source: "editorial-sidebar-grouping",
    });
  });
});
