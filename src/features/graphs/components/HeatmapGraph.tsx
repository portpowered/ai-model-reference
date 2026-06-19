"use client";

import { useEffect, useId, useRef } from "react";
import { GridComponent, TooltipComponent, VisualMapComponent } from "echarts/components";
import { HeatmapChart } from "echarts/charts";
import { CanvasRenderer } from "echarts/renderers";

const AXIS_LABEL_COLOR = "#f0ede6";
const AXIS_LINE_COLOR = "#d9ded9";
const TOOLTIP_BACKGROUND = "#112126";
const TOOLTIP_TEXT = "#f4f1ea";
const CELL_LABEL_COLOR = "#f6f1ea";

export type HeatmapGraphProps = {
  axisLabelX: string;
  axisLabelY: string;
  chartLabel: string;
  dataTestId?: string;
  heightClassName?: string;
  legendCenterLabel?: string;
  max: number;
  min: number;
  negativeColor: string;
  positiveColor: string;
  valueFormatter?: (value: number) => string;
  xLabels: readonly string[];
  yLabels: readonly string[];
  zeroColor: string;
  zMatrix: readonly (readonly number[])[];
};

export function HeatmapGraph({
  axisLabelX,
  axisLabelY,
  chartLabel,
  dataTestId,
  heightClassName = "h-[320px]",
  legendCenterLabel = "0",
  max,
  min,
  negativeColor,
  positiveColor,
  valueFormatter = defaultValueFormatter,
  xLabels,
  yLabels,
  zeroColor,
  zMatrix,
}: HeatmapGraphProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const chartRootId = useId();

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;

    async function mount() {
      if (!chartRef.current) {
        return;
      }

      const echarts = await import("echarts/core");
      echarts.use([
        GridComponent,
        TooltipComponent,
        VisualMapComponent,
        HeatmapChart,
        CanvasRenderer,
      ]);

      if (!chartRef.current || disposed) {
        return;
      }

      const chart = echarts.init(chartRef.current, undefined, {
        renderer: "canvas",
      });

      const seriesData = zMatrix.flatMap((row, yIndex) =>
        row.map((value, xIndex) => [xIndex, yIndex, Number(value.toFixed(2))]),
      );

      const applyOption = () => {
        chart.setOption({
          animation: false,
          backgroundColor: "transparent",
          tooltip: {
            backgroundColor: TOOLTIP_BACKGROUND,
            borderColor: TOOLTIP_BACKGROUND,
            textStyle: {
              color: TOOLTIP_TEXT,
            },
            formatter(params: { value?: number[]; seriesName?: string }) {
              const value = params.value ?? [];
              const xIndex = value[0] ?? 0;
              const yIndex = value[1] ?? 0;
              const activation = value[2] ?? 0;

              return [
                params.seriesName ?? chartLabel,
                `${axisLabelY}: ${yLabels[yIndex]}`,
                `${axisLabelX}: ${xLabels[xIndex]}`,
                `Value: ${valueFormatter(activation)}`,
              ].join("<br/>");
            },
          },
          grid: {
            left: "13%",
            right: "8%",
            top: 12,
            bottom: 52,
            containLabel: true,
          },
          xAxis: {
            type: "category",
            data: xLabels,
            name: axisLabelX,
            nameLocation: "middle",
            nameGap: 28,
            axisLabel: {
              color: AXIS_LABEL_COLOR,
            },
            axisLine: {
              lineStyle: {
                color: AXIS_LINE_COLOR,
              },
            },
            splitArea: {
              show: true,
              areaStyle: {
                color: ["rgba(14, 24, 28, 0.12)", "rgba(12, 20, 24, 0.2)"],
              },
            },
          },
          yAxis: {
            type: "category",
            data: yLabels,
            name: axisLabelY,
            nameLocation: "middle",
            nameGap: 50,
            axisLabel: {
              color: AXIS_LABEL_COLOR,
            },
            axisLine: {
              lineStyle: {
                color: AXIS_LINE_COLOR,
              },
            },
          },
          visualMap: {
            type: "continuous",
            show: false,
            seriesIndex: 0,
            min,
            max,
            precision: 1,
            calculable: false,
            inRange: {
              color: [negativeColor, zeroColor, positiveColor],
            },
          },
          series: [
            {
              type: "heatmap",
              name: chartLabel,
              data: seriesData,
              label: {
                show: true,
                color: CELL_LABEL_COLOR,
                fontSize: 10,
                formatter(params: { value?: number[] }) {
                  return valueFormatter(params.value?.[2] ?? 0);
                },
              },
              emphasis: {
                itemStyle: {
                  borderColor: "#f3e7d4",
                  borderWidth: 1,
                },
              },
            },
          ],
        });
        chart.resize();
      };

      applyOption();

      const resizeObserver = new ResizeObserver(() => {
        applyOption();
      });
      resizeObserver.observe(chartRef.current);

      cleanup = () => {
        resizeObserver.disconnect();
        chart.dispose();
      };
    }

    mount();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [
    axisLabelX,
    axisLabelY,
    chartLabel,
    max,
    min,
    negativeColor,
    positiveColor,
    valueFormatter,
    xLabels,
    yLabels,
    zeroColor,
    zMatrix,
  ]);

  return (
    <div data-heatmap-graph={dataTestId ?? chartLabel} className="space-y-3">
      <div className="text-center text-xs font-medium uppercase tracking-[0.18em] text-foreground">
        {chartLabel}
      </div>

      <div className="rounded-xl bg-background p-3">
        <div
          ref={chartRef}
          id={chartRootId}
          data-echarts-heatmap="true"
          className={`w-full ${heightClassName}`}
        />
        <div className="mt-3 ml-auto w-44 bg-background px-3 py-2" data-heatmap-legend="true">
          <div className="relative">
            <div
              aria-hidden="true"
              className="h-3 rounded-full"
              style={{
                background: `linear-gradient(90deg, ${negativeColor} 0%, ${zeroColor} 50%, ${positiveColor} 100%)`,
              }}
            />
            <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center justify-between px-[1px]">
              <span className="h-4 w-px bg-foreground/60" />
              <span className="h-4 w-px bg-foreground/80" />
              <span className="h-4 w-px bg-foreground/60" />
            </div>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-foreground/90">
            <span>{valueFormatter(min)}</span>
            <span>{legendCenterLabel}</span>
            <span>{valueFormatter(max)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function defaultValueFormatter(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toFixed(2).replace(/\.?0+$/, "");
}
