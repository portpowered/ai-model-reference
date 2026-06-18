"use client";

import { usePageMessages } from "@/features/docs/components/page-messages-context";
import { LineGraph } from "@/features/graphs/components/LineGraph";
import { sampleLineGraphFunctions } from "@/features/graphs/components/line-graph-functions";
import { lookupMessage } from "@/lib/content/messages";

const LEAKY_RELU_ALPHA = 0.1;

const ACTIVATION_VARIANTS = ["relu", "leakyRelu", "silu"] as const;

type ActivationVariant = (typeof ACTIVATION_VARIANTS)[number];

type ActivationSeriesDefinition = {
  evaluate: (x: number) => number;
  color: string;
};

type ActivationChartDefinition = {
  variants: readonly ActivationVariant[];
  highlightedVariant?: ActivationVariant;
};

const ACTIVATION_SERIES: Record<ActivationVariant, ActivationSeriesDefinition> =
  {
    relu: {
      evaluate: (x) => Math.max(0, x),
      color: "var(--primary)",
    },
    leakyRelu: {
      evaluate: (x) => (x >= 0 ? x : LEAKY_RELU_ALPHA * x),
      color:
        "color-mix(in oklch, var(--secondary-foreground) 55%, var(--secondary) 45%)",
    },
    silu: {
      evaluate: (x) => x / (1 + Math.exp(-x)),
      color: "var(--secondary-foreground)",
    },
  };

const ACTIVATION_CHARTS: Record<string, ActivationChartDefinition> = {
  "chart.activation-family.relu-intro": {
    variants: ["relu"],
  },
  "chart.activation-family.relu-silu-comparison": {
    variants: ["relu", "silu"],
  },
};

const ACTIVATION_DATA = sampleLineGraphFunctions({
  domain: [-6, 6],
  sampleCount: 121,
  mapArgs: (x): [number] => [x],
  functions: [
    {
      dataKey: "relu",
      evaluate: (x: number) => ACTIVATION_SERIES.relu.evaluate(x),
    },
    {
      dataKey: "leakyRelu",
      evaluate: (x: number) => ACTIVATION_SERIES.leakyRelu.evaluate(x),
    },
    {
      dataKey: "silu",
      evaluate: (x: number) => ACTIVATION_SERIES.silu.evaluate(x),
    },
  ],
});

function formatVariantValue(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2).replace(/\.?0+$/, "");
}

export function isActivationChartId(
  chartId: string,
): chartId is keyof typeof ACTIVATION_CHARTS {
  return chartId in ACTIVATION_CHARTS;
}

function resolveVariantLabel(
  messages: ReturnType<typeof usePageMessages>["messages"],
  assetId: string,
  variantId: ActivationVariant,
) {
  const result = lookupMessage(
    messages,
    `assets.${assetId}.variants.${variantId}.label`,
  );

  if (result.ok) {
    return result.value;
  }

  if (variantId === "leakyRelu") {
    return "LeakyReLU";
  }

  return variantId === "silu" ? "SiLU" : "ReLU";
}

function buildChartConfig(
  messages: ReturnType<typeof usePageMessages>["messages"],
  assetId: string,
) {
  return ACTIVATION_VARIANTS.map((variantId) => {
    return {
      dataKey: variantId,
      label: resolveVariantLabel(messages, assetId, variantId),
      color: ACTIVATION_SERIES[variantId].color,
      strokeWidth: 3.5,
    };
  });
}

export function ActivationFunctionChart({
  assetId,
  chartId,
  alt,
  caption,
}: {
  assetId: string;
  chartId: string;
  alt?: string;
  caption?: string;
}) {
  const { messages } = usePageMessages();

  if (!isActivationChartId(chartId)) {
    return null;
  }

  const chartDefinition = ACTIVATION_CHARTS[chartId];
  const allSeries = buildChartConfig(messages, assetId);
  const series = allSeries.filter((item) =>
    chartDefinition.variants.includes(item.dataKey as ActivationVariant),
  );

  return (
    <figure
      data-page-asset={assetId}
      data-asset-type="chart"
      data-activation-chart="true"
      data-chart-id={chartId}
      className="space-y-3"
    >
      <LineGraph
        axisLabelX="x"
        axisLabelY="f(x)"
        chartLabel="Activation Curves"
        data={ACTIVATION_DATA}
        dataTestId={chartId}
        series={series}
        tooltipLabelFormatter={(label) => `x = ${label}`}
        tooltipValueFormatter={(value) => formatVariantValue(value)}
        xAxis={{
          dataKey: "x",
          domain: [-6, 6],
          ticks: [-6, -3, 0, 3, 6],
        }}
        yAxis={{
          domain: [-1.5, 6],
          ticks: [-1, 0, 2, 4, 6],
          width: 36,
        }}
      />

      <div className="sr-only" role="img" aria-label={alt ?? chartId}>
        {alt ?? chartId}
      </div>

      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
