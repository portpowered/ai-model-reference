"use client";

import { usePageMessages } from "@/features/docs/components/page-messages-context";
import { HeatmapGraph } from "@/features/graphs/components/HeatmapGraph";
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

type ActivationLineChartDefinition = {
  kind: "line";
  variants: readonly ActivationVariant[];
};

type ActivationHeatmapChartDefinition = {
  kind: "heatmap";
  title: string;
  beforeTitle: string;
  afterTitle: string;
  tokenLabels: readonly string[];
  channelLabels: readonly string[];
  beforeMatrix: readonly (readonly number[])[];
};

type ActivationChartDefinition =
  | ActivationLineChartDefinition
  | ActivationHeatmapChartDefinition;

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

const RELU_HIDDEN_STATE_MATRIX = [
  [-1.8, 0.6, 1.9, -0.7, 2.4, -2.2],
  [0.3, -1.1, 2.6, 1.4, -0.5, 0.8],
  [-2.4, -0.9, 0.2, 2.1, 1.7, -1.3],
  [1.1, 2.8, -1.6, 0.4, -0.8, 1.9],
  [-0.6, 1.5, -2.1, 2.3, 0.7, -1.7],
  [2.5, -0.4, 1.2, -2.0, 0.9, 2.2],
  [-1.4, 0.1, 2.0, -0.3, 1.6, -2.5],
  [0.8, -1.9, 1.4, 2.7, -0.2, 0.5],
] as const;

const HEATMAP_NEGATIVE_COLOR = "#ff3b30";
const HEATMAP_ZERO_COLOR = "var(--background)";
const HEATMAP_POSITIVE_COLOR = "#2f7dff";
const HEATMAP_MIN = -3;
const HEATMAP_MAX = 3;

const ACTIVATION_CHARTS: Record<string, ActivationChartDefinition> = {
  "chart.activation-family.relu-intro": {
    kind: "line",
    variants: ["relu"],
  },
  "chart.activation-family.relu-silu-comparison": {
    kind: "line",
    variants: ["relu", "silu"],
  },
  "chart.activation-family.relu-hidden-state-heatmap": {
    kind: "heatmap",
    title: "Hidden State Activity Through ReLU",
    beforeTitle: "Hidden State Before ReLU",
    afterTitle: "Hidden State After ReLU",
    tokenLabels: ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"],
    channelLabels: ["c1", "c2", "c3", "c4", "c5", "c6"],
    beforeMatrix: RELU_HIDDEN_STATE_MATRIX,
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

function buildLineChartConfig(
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

function ActivationHeatmapComparison({
  assetId,
  chartId,
  definition,
  alt,
  caption,
}: {
  assetId: string;
  chartId: string;
  definition: ActivationHeatmapChartDefinition;
  alt?: string;
  caption?: string;
}) {
  const afterMatrix = definition.beforeMatrix.map((row) =>
    row.map((value) => Math.max(0, value)),
  );

  return (
    <figure
      data-page-asset={assetId}
      data-asset-type="chart"
      data-activation-chart="true"
      data-chart-id={chartId}
      className="space-y-3"
    >
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">
          {definition.title}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <HeatmapGraph
          axisLabelX="Hidden channel"
          axisLabelY="Token position"
          chartLabel={definition.beforeTitle}
          dataTestId={`${chartId}-before`}
          heightClassName="h-[320px]"
          legendCenterLabel="0"
          max={HEATMAP_MAX}
          min={HEATMAP_MIN}
          negativeColor={HEATMAP_NEGATIVE_COLOR}
          positiveColor={HEATMAP_POSITIVE_COLOR}
          valueFormatter={formatVariantValue}
          xLabels={definition.channelLabels}
          yLabels={definition.tokenLabels}
          zeroColor={HEATMAP_ZERO_COLOR}
          zMatrix={definition.beforeMatrix}
        />
        <HeatmapGraph
          axisLabelX="Hidden channel"
          axisLabelY="Token position"
          chartLabel={definition.afterTitle}
          dataTestId={`${chartId}-after`}
          heightClassName="h-[320px]"
          legendCenterLabel="0"
          max={HEATMAP_MAX}
          min={HEATMAP_MIN}
          negativeColor={HEATMAP_NEGATIVE_COLOR}
          positiveColor={HEATMAP_POSITIVE_COLOR}
          valueFormatter={formatVariantValue}
          xLabels={definition.channelLabels}
          yLabels={definition.tokenLabels}
          zeroColor={HEATMAP_ZERO_COLOR}
          zMatrix={afterMatrix}
        />
      </div>

      <div className="sr-only" role="img" aria-label={alt ?? chartId}>
        {alt ?? chartId}
      </div>

      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}

function ActivationLineChart({
  assetId,
  chartId,
  definition,
  alt,
  caption,
}: {
  assetId: string;
  chartId: string;
  definition: ActivationLineChartDefinition;
  alt?: string;
  caption?: string;
}) {
  const { messages } = usePageMessages();
  const allSeries = buildLineChartConfig(messages, assetId);
  const series = allSeries.filter((item) =>
    definition.variants.includes(item.dataKey as ActivationVariant),
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
  if (!isActivationChartId(chartId)) {
    return null;
  }

  const chartDefinition = ACTIVATION_CHARTS[chartId];

  if (chartDefinition.kind === "heatmap") {
    return (
      <ActivationHeatmapComparison
        assetId={assetId}
        chartId={chartId}
        definition={chartDefinition}
        alt={alt}
        caption={caption}
      />
    );
  }

  return (
    <ActivationLineChart
      assetId={assetId}
      chartId={chartId}
      definition={chartDefinition}
      alt={alt}
      caption={caption}
    />
  );
}
