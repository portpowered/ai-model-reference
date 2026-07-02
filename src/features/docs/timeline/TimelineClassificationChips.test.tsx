import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TimelineClassificationChips } from "@/features/docs/timeline/TimelineClassificationChips";

describe("TimelineClassificationChips", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders chip links with active state and classification query parameters", () => {
    render(
      <TimelineClassificationChips
        basePath="/docs/timeline"
        chips={[
          {
            classificationId: "classification.activation-functions",
            slug: "activation-functions",
            title: "activation function",
            classificationType: "family",
            eventCount: 6,
            active: true,
          },
          {
            classificationId: "classification.feed-forward-networks",
            slug: "feed-forward-networks",
            title: "feed-forward network",
            classificationType: "family",
            eventCount: 2,
            active: false,
          },
        ]}
        labels={{
          navigation: "Browse nearby classifications",
          eventCount: "{count} dated events",
        }}
      />,
    );

    const activationChip = screen.getByRole("link", {
      name: /activation function/i,
    });
    const feedForwardChip = screen.getByRole("link", {
      name: /feed-forward network/i,
    });

    expect(activationChip.getAttribute("href")).toBe(
      "/docs/timeline?classification=activation-functions",
    );
    expect(activationChip.getAttribute("aria-current")).toBe("page");
    expect(feedForwardChip.getAttribute("href")).toBe(
      "/docs/timeline?classification=feed-forward-networks",
    );
  });

  test("supports arrow, home, and end keyboard focus movement across chips", () => {
    render(
      <TimelineClassificationChips
        basePath="/docs/timeline"
        chips={[
          {
            classificationId: "classification.activation-functions",
            slug: "activation-functions",
            title: "activation function",
            classificationType: "family",
            eventCount: 6,
            active: true,
          },
          {
            classificationId: "classification.feed-forward-networks",
            slug: "feed-forward-networks",
            title: "feed-forward network",
            classificationType: "family",
            eventCount: 2,
            active: false,
          },
        ]}
        labels={{
          navigation: "Browse nearby classifications",
          eventCount: "{count} dated events",
        }}
      />,
    );

    const activationChip = screen.getByRole("link", {
      name: /activation function/i,
    });
    const feedForwardChip = screen.getByRole("link", {
      name: /feed-forward network/i,
    });

    activationChip.focus();
    fireEvent.keyDown(activationChip, { key: "ArrowRight" });
    expect(document.activeElement).toBe(feedForwardChip);

    fireEvent.keyDown(feedForwardChip, { key: "Home" });
    expect(document.activeElement).toBe(activationChip);

    fireEvent.keyDown(activationChip, { key: "End" });
    expect(document.activeElement).toBe(feedForwardChip);

    fireEvent.keyDown(feedForwardChip, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(activationChip);
  });
});
