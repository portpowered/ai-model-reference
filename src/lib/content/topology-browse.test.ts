import { describe, expect, test } from "bun:test";
import type { ClassificationSubtreeClassificationNode } from "@/lib/content/registry-runtime";
import {
  readTopologyBrowseStateFromLocationSearch,
  resolveTopologyBrowseState,
  type TopologySearchParams,
} from "@/lib/content/topology-browse";
import { listTopologyNavigationOptions } from "@/lib/content/topology-navigation";

function publishedClassificationNode(
  overrides: Partial<ClassificationSubtreeClassificationNode>,
): ClassificationSubtreeClassificationNode {
  return {
    nodeType: "classification",
    classification: {
      id: "classification.example",
      slug: "example",
      kind: "classification",
      defaultTitleKey: "title",
      defaultSummaryKey: "description",
      aliases: [],
      tags: [],
      relatedIds: [],
      citationIds: [],
      status: "published",
      createdAt: "2026-06-20T00:00:00.000Z",
      updatedAt: "2026-06-20T00:00:00.000Z",
      classificationType: "family",
      classifiesKinds: ["module"],
      parentClassificationId: "classification.module",
    },
    children: [],
    classificationChildren: [],
    recordChildren: [],
    directMemberCount: 0,
    descendantMemberCount: 0,
    hasMatchingMembers: false,
    totalMemberCount: 0,
    ...overrides,
  };
}

describe("topology browse request state", () => {
  test("leaves the standard browse page active when no topology params are present", () => {
    const state = resolveTopologyBrowseState(
      {},
      listTopologyNavigationOptions(),
    );

    expect(state.kind).toBe("not-requested");
  });

  test("selects activation graph-map state from URL parameters", () => {
    const state = resolveTopologyBrowseState(
      {
        classification: "activation-functions",
        mode: "graph-map",
      },
      listTopologyNavigationOptions(),
    );

    expect(state.kind).toBe("selected");
    if (state.kind !== "selected") {
      return;
    }
    expect(state.option.classificationSlug).toBe("activation-functions");
    expect(state.mode).toBe("graph-map");
  });

  test("accepts canonical classification ids for supported topology options", () => {
    const state = resolveTopologyBrowseState(
      {
        classification: "classification.module.activation",
        mode: "graph-map",
      },
      listTopologyNavigationOptions(),
    );

    expect(state.kind).toBe("selected");
    if (state.kind !== "selected") {
      return;
    }
    expect(state.option.classificationId).toBe(
      "classification.module.activation",
    );
    expect(state.option.classificationSlug).toBe("activation-functions");
    expect(state.mode).toBe("graph-map");
  });

  test("accepts fenced compatibility selectors for supported topology options", () => {
    const state = resolveTopologyBrowseState(
      {
        classification: "classification.attention-mechanisms",
        mode: "graph-map",
      },
      listTopologyNavigationOptions(),
    );

    expect(state.kind).toBe("selected");
    if (state.kind !== "selected") {
      return;
    }
    expect(state.option.classificationId).toBe(
      "classification.module.attention",
    );
    expect(state.option.classificationSlug).toBe("attention-mechanisms");
    expect(state.mode).toBe("graph-map");
  });

  test("selects feed-forward timeline state from URL parameters", () => {
    const state = resolveTopologyBrowseState(
      {
        classification: "feed-forward-networks",
        mode: "timeline",
      },
      listTopologyNavigationOptions(),
    );

    expect(state.kind).toBe("selected");
    if (state.kind !== "selected") {
      return;
    }
    expect(state.option.classificationSlug).toBe("feed-forward-networks");
    expect(state.mode).toBe("timeline");
  });

  test("reports unsupported classification and mode as invalid state", () => {
    const state = resolveTopologyBrowseState(
      {
        classification: "attention",
        mode: "matrix",
      },
      listTopologyNavigationOptions(),
    );

    expect(state).toMatchObject({
      kind: "invalid",
      requestedClassification: "attention",
      requestedMode: "matrix",
      classificationStatus: "unsupported",
      modeStatus: "unsupported",
    });
  });

  test("treats filtered-out branches as invalid when the runtime subtree has no matching descendants", () => {
    const emptyBranch = publishedClassificationNode({
      classification: {
        ...publishedClassificationNode({}).classification,
        id: "classification.no-matching-descendants",
        slug: "no-matching-descendants",
      },
    });
    const eligibleBranch = publishedClassificationNode({
      classification: {
        ...publishedClassificationNode({}).classification,
        id: "classification.activation-functions",
        slug: "activation-functions",
      },
      totalMemberCount: 2,
    });
    const options = listTopologyNavigationOptions({
      tree: [
        publishedClassificationNode({
          classification: {
            ...publishedClassificationNode({}).classification,
            id: "classification.module",
            slug: "module",
            classificationType: "domain",
            parentClassificationId: undefined,
          },
          classificationChildren: [emptyBranch, eligibleBranch],
          children: [emptyBranch, eligibleBranch],
          totalMemberCount: 2,
        }),
      ],
    });

    expect(options.map((option) => option.classificationSlug)).toEqual([
      "activation-functions",
    ]);

    expect(
      resolveTopologyBrowseState(
        {
          classification: "no-matching-descendants",
          mode: "graph-map",
        },
        options,
      ),
    ).toMatchObject({
      kind: "invalid",
      requestedClassification: "no-matching-descendants",
      requestedMode: "graph-map",
      classificationStatus: "unsupported",
      modeStatus: "valid",
    });
  });

  test("uses the first value for repeated query parameters", () => {
    const searchParams: TopologySearchParams = {
      classification: ["feed-forward-networks", "activation-functions"],
      mode: ["timeline", "graph-map"],
    };

    const state = resolveTopologyBrowseState(
      searchParams,
      listTopologyNavigationOptions(),
    );

    expect(state.kind).toBe("selected");
    if (state.kind !== "selected") {
      return;
    }
    expect(state.option.classificationSlug).toBe("feed-forward-networks");
    expect(state.mode).toBe("timeline");
  });

  test("reads topology state from a browser-style location search string", () => {
    const state = readTopologyBrowseStateFromLocationSearch(
      listTopologyNavigationOptions(),
      "?classification=activation-functions&mode=graph-map",
    );

    expect(state.kind).toBe("selected");
    if (state.kind !== "selected") {
      return;
    }
    expect(state.option.classificationSlug).toBe("activation-functions");
    expect(state.mode).toBe("graph-map");
  });
});
