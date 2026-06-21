import { describe, expect, test } from "bun:test";
import {
  getSidebarGroupIdsForSection,
  getSidebarGroupingSectionsForKind,
  resolveConceptsSidebarGroupWithSource,
  resolveGlossarySidebarGroupWithSource,
  resolveModulesSidebarGroupWithSource,
  resolveSystemsSidebarGroup,
  resolveSystemsSidebarGroupWithSource,
  resolveTrainingSidebarGroupWithSource,
  SIDEBAR_GROUP_LABELS,
  SIDEBAR_GROUPING_PRECEDENCE,
  validateSidebarGroupingForRecord,
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

  test("derives covered module groups from ontology membership before compatibility fallback", () => {
    expect(
      resolveModulesSidebarGroupWithSource({
        primaryClassificationId: "classification.module.feed-forward",
      }),
    ).toEqual({
      groupId: "feed-forward-and-activation",
      source: "derived-taxonomy",
    });
    expect(
      resolveModulesSidebarGroupWithSource({
        primaryClassificationId: "classification.module.attention",
      }),
    ).toEqual({
      groupId: "attention-variants",
      source: "derived-taxonomy",
    });
    expect(
      resolveModulesSidebarGroupWithSource({
        primaryClassificationId: "classification.module.attention",
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
        sidebarGrouping: {
          modules: "attention-foundations",
        },
      }),
    ).toEqual({
      groupId: "attention-variants",
      source: "derived-taxonomy",
    });
  });

  test("rejects redundant or ignored editorial sidebar metadata once ontology already resolves the subgroup", () => {
    expect(
      validateSidebarGroupingForRecord(
        "concept",
        "concept.transformer-architecture",
        {
          primaryClassificationId: "classification.concept.architecture",
          sidebarGrouping: {
            concepts: "architecture",
          },
        },
      ),
    ).toEqual([
      {
        path: ["concepts"],
        message:
          'Record concept.transformer-architecture defines redundant sidebarGrouping.concepts = "architecture". Canonical classification membership already resolves this subgroup to "architecture". Remove the editorial override until the ontology model needs a true exception.',
      },
    ]);

    expect(
      validateSidebarGroupingForRecord(
        "module",
        "module.multi-head-attention",
        {
          primaryClassificationId: "classification.module.attention.multi-head",
          secondaryClassificationIds: ["classification.module.attention"],
          sidebarGrouping: {
            modules: "attention-foundations",
          },
        },
      ),
    ).toEqual([
      {
        path: ["modules"],
        message:
          'Record module.multi-head-attention defines redundant sidebarGrouping.modules = "attention-foundations". Canonical classification membership already resolves this subgroup to "attention-variants". Remove the editorial override until the ontology model needs a true exception.',
      },
    ]);
  });

  test("derives training and system groups from ontology when the branch is modeled", () => {
    expect(
      resolveTrainingSidebarGroupWithSource({
        primaryClassificationId: "classification.training.alignment",
      }),
    ).toEqual({
      groupId: "alignment",
      source: "derived-taxonomy",
    });
    expect(
      resolveTrainingSidebarGroupWithSource({
        sidebarGrouping: {
          training: "distillation",
        },
      }),
    ).toEqual({
      groupId: "distillation",
      source: "editorial-sidebar-grouping",
    });

    expect(
      resolveSystemsSidebarGroupWithSource({
        primaryClassificationId: "classification.system.routing",
      }),
    ).toEqual({
      groupId: "routing",
      source: "derived-taxonomy",
    });
    expect(
      resolveSystemsSidebarGroupWithSource({
        sidebarGrouping: {
          systems: "memory",
        },
      }),
    ).toEqual({
      groupId: "memory",
      source: "editorial-sidebar-grouping",
    });
  });

  test("does not silently derive training or system groups without ontology detail or explicit overrides", () => {
    expect(
      resolveTrainingSidebarGroupWithSource({
        primaryClassificationId: undefined,
      }),
    ).toBeUndefined();
    expect(
      resolveSystemsSidebarGroupWithSource({
        primaryClassificationId: undefined,
      }),
    ).toBeUndefined();
  });

  test("derives concept and glossary groups from ontology first, then explicit editorial fallback", () => {
    expect(
      resolveConceptsSidebarGroupWithSource({
        primaryClassificationId: "classification.concept.inference",
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

  test("exposes stable subgroup labels for systems navigation", () => {
    expect(getSidebarGroupIdsForSection("systems")).toEqual([
      "memory",
      "routing",
      "serving",
    ]);
    expect(SIDEBAR_GROUP_LABELS.systems.serving).toBe("Serving");
    expect(resolveSystemsSidebarGroup({ systemType: "serving" })).toBe(
      "serving",
    );
  });
});
