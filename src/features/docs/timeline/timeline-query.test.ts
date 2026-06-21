import { describe, expect, test } from "bun:test";
import {
  buildTimelineClassificationHref,
  getCanonicalTimelineSelectorForOutput,
  getDefaultTimelineClassificationSelector,
  normalizeTimelineClassificationSelector,
} from "@/features/docs/timeline/timeline-query";

describe("timeline query canonical output", () => {
  test("defaults a missing selector to the canonical activation timeline slug", () => {
    expect(normalizeTimelineClassificationSelector(undefined)).toBe(
      "activation-functions",
    );
  });

  test("pins the default selector to the canonical activation classification path", () => {
    expect(
      getCanonicalTimelineSelectorForOutput("classification.module.activation"),
    ).toBe(getDefaultTimelineClassificationSelector());
  });

  test("maps accepted legacy timeline selectors back to the canonical output slug", () => {
    expect(
      getCanonicalTimelineSelectorForOutput(
        "classification.feed-forward-networks",
      ),
    ).toBe("feed-forward-networks");
    expect(getCanonicalTimelineSelectorForOutput("feed-forward")).toBe(
      "feed-forward-networks",
    );
  });

  test("builds canonical outbound timeline hrefs even when compatibility selectors are provided", () => {
    expect(
      buildTimelineClassificationHref(
        "/docs/timeline",
        "classification.feed-forward-networks",
      ),
    ).toBe("/docs/timeline?classification=feed-forward-networks");
    expect(
      buildTimelineClassificationHref("/docs/timeline", "feed-forward"),
    ).toBe("/docs/timeline?classification=feed-forward-networks");
  });

  test("preserves unknown selectors so the empty-state path stays observable", () => {
    expect(
      getCanonicalTimelineSelectorForOutput("classification.activation"),
    ).toBe("classification.activation");
  });
});
