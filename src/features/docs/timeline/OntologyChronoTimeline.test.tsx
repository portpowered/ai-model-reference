import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";

mock.module("react-chrono", () => ({
  Chrono: () => {
    throw new Error("chrono render failed");
  },
}));

import { OntologyChronoTimeline } from "@/features/docs/timeline/OntologyChronoTimeline";

const defaultLabels = {
  docsLink: "Open docs page",
  regionLabel: "Activation chronology",
  sourcePrefix: "Date source:",
  loadingTitle: "Loading timeline",
  loadingDescription: "Preparing the interactive timeline renderer.",
  errorTitle: "Timeline renderer unavailable",
  errorDescription:
    "The interactive timeline could not load, but the dated event list below still works.",
};

describe("OntologyChronoTimeline", () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = (...args: unknown[]) => {
      const [firstArg] = args;
      if (
        firstArg instanceof Error ||
        (typeof firstArg === "string" &&
          firstArg.includes("chrono render failed"))
      ) {
        return;
      }
      originalConsoleError(...args);
    };
  });

  afterEach(() => {
    cleanup();
    console.error = originalConsoleError;
  });

  test("shows a non-destructive error state when the timeline renderer throws", async () => {
    render(
      <OntologyChronoTimeline
        items={[
          {
            registryId: "module.relu",
            kind: "module",
            slug: "relu",
            title: "Rectified Linear Unit",
            summary: "Keeps positive values and clips negatives to zero.",
            href: "/docs/modules/relu",
            dateLabel: "2010",
            dateValue: "2010-01-01",
            dateKind: "Published",
            classificationMemberships: [
              {
                classificationId: "classification.activation-functions",
                classificationSlug: "activation",
                classificationTitle: "activation function",
                membershipType: "primary",
              },
            ],
            relationshipContext: [],
            source: {
              title:
                "Rectified Linear Units Improve Restricted Boltzmann Machines",
              url: "https://example.com/relu",
            },
          },
        ]}
        labels={defaultLabels}
      />,
    );

    const errorState = await screen.findByTestId("ontology-timeline-error");
    expect(errorState.textContent).toContain(defaultLabels.errorTitle);
    expect(screen.getByText(defaultLabels.errorDescription)).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Rectified Linear Unit" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: defaultLabels.docsLink })
        .getAttribute("href"),
    ).toBe("/docs/modules/relu");
  });
});
