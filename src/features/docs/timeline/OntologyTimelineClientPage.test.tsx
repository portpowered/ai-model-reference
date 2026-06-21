import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { OntologyTimelineClientPage } from "@/features/docs/timeline/OntologyTimelineClientPage";
import { loadPreloadedTimelineSelections } from "@/features/docs/timeline/OntologyTimelinePage";
import { loadUiMessages } from "@/lib/content/ui-messages";

describe("OntologyTimelineClientPage", () => {
  const originalLocation = window.location;

  function setWindowLocationSearch(search: string) {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...originalLocation,
        search,
      },
    });
  }

  beforeEach(() => {
    setWindowLocationSearch("");
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  test("hydrates the feed-forward classification from the URI without server search params", async () => {
    setWindowLocationSearch("?classification=feed-forward-networks");

    const messages = await loadUiMessages("en");
    const preloadedTimelines = loadPreloadedTimelineSelections("en");
    const feedForwardTimeline = preloadedTimelines["feed-forward-networks"];

    if (feedForwardTimeline?.status !== "success") {
      throw new Error("Expected feed-forward timeline preload to resolve");
    }

    render(
      <OntologyTimelineClientPage
        initialTimeline={preloadedTimelines.activation}
        locale="en"
        messages={messages}
        preloadedTimelines={preloadedTimelines}
      />,
    );

    await waitFor(() => {
      const feedForwardChip = screen
        .getAllByRole("link", { name: /feed-forward network/i })
        .find(
          (element) =>
            element.getAttribute("href") ===
            "/docs/timeline?classification=feed-forward-networks",
        );

      expect(feedForwardChip?.getAttribute("aria-current")).toBe("page");
    });

    const nearbyClassificationHrefs = [
      "/docs/timeline?classification=attention-mechanisms",
      "/docs/timeline?classification=normalization-layers",
      "/docs/timeline?classification=position-encoding-methods",
      "/docs/timeline?classification=tokenization-methods",
    ];

    for (const href of nearbyClassificationHrefs) {
      expect(
        screen
          .getAllByRole("link")
          .some((element) => element.getAttribute("href") === href),
      ).toBe(true);
    }
  });

  test("hydrates an invalid classification into the recoverable empty state", async () => {
    setWindowLocationSearch("?classification=not-a-real-slice");

    const messages = await loadUiMessages("en");
    const preloadedTimelines = loadPreloadedTimelineSelections("en");

    render(
      <OntologyTimelineClientPage
        initialTimeline={preloadedTimelines.activation}
        locale="en"
        messages={messages}
        preloadedTimelines={preloadedTimelines}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("No dated timeline events")).toBeTruthy();
    });
    expect(screen.getByText(/not-a-real-slice/)).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: messages.timelinePage.activationLink })
        .getAttribute("href"),
    ).toBe("/docs/timeline?classification=activation");
  });
});
