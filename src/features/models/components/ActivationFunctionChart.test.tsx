import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render } from "@testing-library/react";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { pageMessagesSchema } from "@/lib/content/schemas";

const reluPageDir = getDocsPageDir("modules", "relu");
const sigmoidPageDir = getDocsPageDir("modules", "sigmoid");
const tanhPageDir = getDocsPageDir("modules", "tanh");
const geluPageDir = getDocsPageDir("modules", "gelu");

const reluMessages = pageMessagesSchema.parse(
  JSON.parse(readFileSync(join(reluPageDir, "messages/en.json"), "utf8")),
);

const sigmoidMessages = pageMessagesSchema.parse(
  JSON.parse(readFileSync(join(sigmoidPageDir, "messages/en.json"), "utf8")),
);

const tanhMessages = pageMessagesSchema.parse(
  JSON.parse(readFileSync(join(tanhPageDir, "messages/en.json"), "utf8")),
);

const geluMessages = pageMessagesSchema.parse(
  JSON.parse(readFileSync(join(geluPageDir, "messages/en.json"), "utf8")),
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

  test("renders only the sigmoid curve on the sigmoid intro chart", async () => {
    const { ActivationFunctionChart } = await import(
      "@/features/models/components/ActivationFunctionChart"
    );

    const { container } = render(
      <PageMessagesProvider messages={sigmoidMessages} isDev={false}>
        <ActivationFunctionChart
          assetId="computeFlow"
          chartId="chart.activation-family.sigmoid-intro"
          alt={sigmoidMessages.assets?.computeFlow?.alt}
          caption={sigmoidMessages.assets?.computeFlow?.caption}
        />
      </PageMessagesProvider>,
    );

    expect(
      container.querySelector(
        '[data-chart-id="chart.activation-family.sigmoid-intro"]',
      ),
    ).toBeTruthy();
    expect(container.querySelectorAll(".recharts-line-curve").length).toBe(1);
    expect(container.querySelector(".line-graph__line--sigmoid")).toBeTruthy();
    expect(container.querySelector(".line-graph__line--relu")).toBeNull();
    expect(container.textContent).toContain("Activation Curves");
    expect(container.textContent).toContain("Sigmoid");
  });

  test("renders only the tanh curve on the tanh intro chart", async () => {
    const { ActivationFunctionChart } = await import(
      "@/features/models/components/ActivationFunctionChart"
    );

    const { container } = render(
      <PageMessagesProvider messages={tanhMessages} isDev={false}>
        <ActivationFunctionChart
          assetId="computeFlow"
          chartId="chart.activation-family.tanh-intro"
          alt={tanhMessages.assets?.computeFlow?.alt}
          caption={tanhMessages.assets?.computeFlow?.caption}
        />
      </PageMessagesProvider>,
    );

    expect(
      container.querySelector(
        '[data-chart-id="chart.activation-family.tanh-intro"]',
      ),
    ).toBeTruthy();
    expect(container.querySelectorAll(".recharts-line-curve").length).toBe(1);
    expect(container.querySelector(".line-graph__line--tanh")).toBeTruthy();
    expect(container.querySelector(".line-graph__line--sigmoid")).toBeNull();
    expect(container.textContent).toContain("Activation Curves");
    expect(container.textContent).toContain("Tanh");
  });

  test("renders GELU alongside ReLU and SiLU on the GELU intro chart", async () => {
    const { ActivationFunctionChart } = await import(
      "@/features/models/components/ActivationFunctionChart"
    );

    const { container } = render(
      <PageMessagesProvider messages={geluMessages} isDev={false}>
        <ActivationFunctionChart
          assetId="computeFlow"
          chartId="chart.activation-family.gelu-intro"
          alt={geluMessages.assets?.computeFlow?.alt}
          caption={geluMessages.assets?.computeFlow?.caption}
        />
      </PageMessagesProvider>,
    );

    expect(
      container.querySelector(
        '[data-chart-id="chart.activation-family.gelu-intro"]',
      ),
    ).toBeTruthy();
    expect(container.querySelectorAll(".recharts-line-curve").length).toBe(3);
    expect(container.querySelector(".line-graph__line--gelu")).toBeTruthy();
    expect(container.querySelector(".line-graph__line--relu")).toBeTruthy();
    expect(container.querySelector(".line-graph__line--silu")).toBeTruthy();
    expect(container.textContent).toContain("GELU");
    expect(container.textContent).toContain("ReLU");
    expect(container.textContent).toContain("SiLU");
  });

  test("renders the ReLU hidden-state heatmap shell", async () => {
    const { ActivationFunctionChart } = await import(
      "@/features/models/components/ActivationFunctionChart"
    );

    const { container } = render(
      <PageMessagesProvider messages={reluMessages} isDev={false}>
        <ActivationFunctionChart
          assetId="hiddenStateHeatmap"
          chartId="chart.activation-family.relu-hidden-state-heatmap"
          alt={reluMessages.assets?.hiddenStateHeatmap?.alt}
          caption={reluMessages.assets?.hiddenStateHeatmap?.caption}
        />
      </PageMessagesProvider>,
    );

    expect(
      container.querySelector(
        '[data-chart-id="chart.activation-family.relu-hidden-state-heatmap"]',
      ),
    ).toBeTruthy();
    expect(
      container.querySelectorAll('[data-echarts-heatmap="true"]').length,
    ).toBe(2);
    expect(
      container.querySelector(
        '[data-heatmap-graph="chart.activation-family.relu-hidden-state-heatmap-before"]',
      ),
    ).toBeTruthy();
    expect(
      container.querySelector(
        '[data-heatmap-graph="chart.activation-family.relu-hidden-state-heatmap-after"]',
      ),
    ).toBeTruthy();
    expect(container.textContent).toContain("Hidden State Before ReLU");
    expect(container.textContent).toContain("Hidden State After ReLU");
  });
});
