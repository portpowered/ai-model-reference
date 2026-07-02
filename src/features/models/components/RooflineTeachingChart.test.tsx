import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render } from "@testing-library/react";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { pageMessagesSchema } from "@/lib/content/schemas";

const rooflinePageDir = getDocsPageDir("concepts", "roofline-model");

const rooflineMessages = pageMessagesSchema.parse(
  JSON.parse(
    readFileSync(join(rooflinePageDir, "messages/en.json"), "utf8"),
  ),
);

describe("RooflineTeachingChart", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders roofline bend, axes from zero, legend labels, and workload markers", async () => {
    const { RooflineTeachingChart } = await import(
      "@/features/models/components/RooflineTeachingChart"
    );

    const { container } = render(
      <PageMessagesProvider messages={rooflineMessages} isDev={false}>
        <RooflineTeachingChart
          assetId="rooflineChart"
          chartId="chart.roofline-model.teaching"
          alt={rooflineMessages.assets?.rooflineChart?.alt}
          caption={rooflineMessages.assets?.rooflineChart?.caption}
        />
      </PageMessagesProvider>,
    );

    expect(
      container.querySelector(
        '[data-chart-id="chart.roofline-model.teaching"]',
      ),
    ).toBeTruthy();
    expect(container.textContent).toContain("Illustrative Roofline Ceiling");
    expect(container.textContent).toContain("Arithmetic intensity");
    expect(container.textContent).toContain("Attainable throughput");
    expect(container.textContent).toContain("Memory-bandwidth bound");
    expect(container.textContent).toContain("Compute bound");
    expect(container.querySelectorAll(".recharts-line-curve").length).toBe(1);
    expect(container.querySelector(".recharts-scatter")).toBeTruthy();
    expect(container.textContent).toContain(
      "Generic illustrative values show the roofline bend",
    );
  });
});
