import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/react";
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
  afterEach(() => {
    cleanup();
  });

  test("renders clickable timeline cards after mount", async () => {
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

    expect(
      await screen.findByRole("link", { name: "Rectified Linear Unit" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("link", { name: defaultLabels.docsLink }).getAttribute("href"),
    ).toBe("/docs/modules/relu");
    expect(screen.getByText(/Date source:/)).toBeTruthy();
  });
});
