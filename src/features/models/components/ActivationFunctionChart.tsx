"use client";

import * as Recharts from "recharts";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { usePageMessages } from "@/features/docs/components/page-messages-context";
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
  "chart.activation-family.relu-silu-comparison": {
    variants: ["relu", "silu"],
  },
};

const AXIS_STROKE =
  "color-mix(in oklch, var(--foreground) 72%, var(--background) 28%)";
const AXIS_TICK_FILL =
  "color-mix(in oklch, var(--foreground) 78%, var(--background) 22%)";
const HOVER_RING = "var(--primary)";
const HOVER_FILL = "var(--background)";

const ACTIVATION_DATA = Array.from({ length: 121 }, (_, index) => {
  const x = Number((-6 + index * 0.1).toFixed(1));

  return {
    x,
    relu: Number(ACTIVATION_SERIES.relu.evaluate(x).toFixed(3)),
    leakyRelu: Number(ACTIVATION_SERIES.leakyRelu.evaluate(x).toFixed(3)),
    silu: Number(ACTIVATION_SERIES.silu.evaluate(x).toFixed(3)),
  };
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
  return ACTIVATION_VARIANTS.reduce((config, variantId) => {
    config[variantId] = {
      label: resolveVariantLabel(messages, assetId, variantId),
      color: ACTIVATION_SERIES[variantId].color,
    };
    return config;
  }, {} as ChartConfig);
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
  const chartConfig = buildChartConfig(messages, assetId);

  return (
    <figure
      data-page-asset={assetId}
      data-asset-type="chart"
      data-activation-chart="true"
      data-chart-id={chartId}
      className="space-y-3"
    >
      <div className="text-center">
        <div className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
          Activation Curves
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card/30">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-2 z-10 flex items-center">
            <span className="-rotate-90 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
              f(x)
            </span>
          </div>
          <div className="pointer-events-none absolute right-4 bottom-2 left-12 z-10 flex justify-center">
            <span className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
              x
            </span>
          </div>

          <ChartContainer
            config={chartConfig}
            className="min-h-[22rem] rounded-none border-0 border-b border-border/70 shadow-none"
          >
            <Recharts.LineChart
              accessibilityLayer
              data={ACTIVATION_DATA}
              margin={{ top: 20, right: 24, bottom: 24, left: 24 }}
            >
              <Recharts.ReferenceLine
                y={0}
                stroke="var(--border)"
                strokeDasharray="4 4"
              />
              <Recharts.ReferenceLine
                x={0}
                stroke="var(--border)"
                strokeDasharray="4 4"
              />
              <Recharts.XAxis
                dataKey="x"
                type="number"
                domain={[-6, 6]}
                ticks={[-6, -3, 0, 3, 6]}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                stroke={AXIS_STROKE}
                tick={{ fill: AXIS_TICK_FILL, fontSize: 12 }}
              />
              <Recharts.YAxis
                domain={[-1.5, 6]}
                ticks={[-1, 0, 2, 4, 6]}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                width={36}
                stroke={AXIS_STROKE}
                tick={{ fill: AXIS_TICK_FILL, fontSize: 12 }}
              />
              <ChartTooltip
                cursor={{ stroke: "var(--border)", strokeDasharray: "4 4" }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) => `x = ${label}`}
                    formatter={(value) => formatVariantValue(Number(value))}
                  />
                }
              />
              {chartDefinition.variants.map((variantId) => {
                const isFocused =
                  variantId === chartDefinition.highlightedVariant;

                return (
                  <Recharts.Line
                    key={variantId}
                    type="monotone"
                    dataKey={variantId}
                    className={`activation-chart__line activation-chart__line--${variantId}`}
                    stroke={chartConfig[variantId].color}
                    strokeWidth={isFocused ? 4.5 : 3.5}
                    opacity={1}
                    dot={false}
                    activeDot={{
                      r: isFocused ? 4.5 : 3,
                      fill: HOVER_FILL,
                      stroke: HOVER_RING,
                      strokeWidth: 2.5,
                    }}
                  />
                );
              })}
            </Recharts.LineChart>
          </ChartContainer>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 bg-card/45 px-4 py-3">
          {chartDefinition.variants.map((variantId) => {
            const series = chartConfig[variantId];

            return (
              <div
                key={variantId}
                className="flex items-center gap-2 text-sm text-foreground"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: series.color }}
                />
                <span>{series.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="sr-only" role="img" aria-label={alt ?? chartId}>
        {alt ?? chartId}
      </div>

      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
