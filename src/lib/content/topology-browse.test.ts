import { describe, expect, test } from "bun:test";
import {
  readTopologyBrowseStateFromLocationSearch,
  resolveTopologyBrowseState,
  type TopologySearchParams,
} from "@/lib/content/topology-browse";
import { listTopologyNavigationOptions } from "@/lib/content/topology-navigation";

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
