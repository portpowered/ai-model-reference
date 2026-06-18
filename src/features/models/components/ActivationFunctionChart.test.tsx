import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render } from "@testing-library/react";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import { RELU_GLOSSARY_PAGE_DIR } from "@/lib/content/content-paths";
import { pageMessagesSchema } from "@/lib/content/schemas";

const reluMessages = pageMessagesSchema.parse(
  JSON.parse(
    readFileSync(join(RELU_GLOSSARY_PAGE_DIR, "messages/en.json"), "utf8"),
  ),
);

describe("ActivationFunctionChart", () => {
  afterEach(() => {
    cleanup();
  });

  test("renders only the ReLU function curve on the ReLU intro chart", async () => {
    const { ActivationFunctionChart } = await import(
      "@/features/models/components/ActivationFunctionChart"
    );

    const { container } = render(
      <PageMessagesProvider messages={reluMessages} isDev={false}>
        <ActivationFunctionChart
          assetId="computeFlow"
          chartId="chart.activation-family.relu-intro"
          alt={reluMessages.assets?.computeFlow?.alt}
          caption={reluMessages.assets?.computeFlow?.caption}
        />
      </PageMessagesProvider>,
    );

    expect(
      container.querySelector(
        '[data-chart-id="chart.activation-family.relu-intro"]',
      ),
    ).toBeTruthy();
    expect(container.querySelectorAll(".recharts-line-curve").length).toBe(1);
    expect(container.querySelector(".line-graph__line--relu")).toBeTruthy();
    expect(container.querySelector(".line-graph__line--silu")).toBeNull();
    expect(container.textContent).toContain("Activation Curves");
  });
});
