"use client";

import * as React from "react";
import * as Recharts from "recharts";
import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";
import type { TooltipContentProps } from "recharts/types/component/Tooltip";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label: string;
    color: string;
  }
>;

const ChartContext = React.createContext<ChartConfig | null>(null);
type ChartDimensions = { width: number; height: number };
const DEFAULT_CHART_DIMENSION: ChartDimensions = { width: 640, height: 320 };
const CHART_HEIGHT = DEFAULT_CHART_DIMENSION.height;

function cloneChartWithDimensions(
  children: React.ReactNode,
  dimensions: ChartDimensions,
): React.ReactNode {
  if (!React.isValidElement(children)) {
    return children;
  }

  return React.cloneElement(
    children as React.ReactElement<{ width?: number; height?: number }>,
    dimensions,
  );
}

function useChartContainerDimensions(enabled: boolean): {
  containerRef: React.RefObject<HTMLDivElement | null>;
  dimensions: ChartDimensions;
} {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState<ChartDimensions>(
    DEFAULT_CHART_DIMENSION,
  );

  React.useLayoutEffect(() => {
    if (!enabled) {
      return;
    }

    const node = containerRef.current;
    if (!node) {
      return;
    }

    const updateDimensions = () => {
      const width = Math.floor(node.getBoundingClientRect().width);
      if (width > 0) {
        setDimensions({ width, height: CHART_HEIGHT });
      }
    };

    updateDimensions();

    const observer = new ResizeObserver(updateDimensions);
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled]);

  return { containerRef, dimensions };
}

export function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within ChartContainer");
  }
  return context;
}

export function ChartContainer({
  config,
  className,
  children,
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<
    typeof Recharts.ResponsiveContainer
  >["children"];
}) {
  const style = Object.fromEntries(
    Object.entries(config).map(([key, value]) => [
      `--color-${key}`,
      value.color,
    ]),
  ) as React.CSSProperties;
  const isTestEnvironment = process.env.NODE_ENV === "test";
  const { containerRef, dimensions } = useChartContainerDimensions(
    !isTestEnvironment,
  );
  const chartChildren = cloneChartWithDimensions(
    children,
    isTestEnvironment ? DEFAULT_CHART_DIMENSION : dimensions,
  );

  return (
    <ChartContext.Provider value={config}>
      <div
        ref={containerRef}
        data-slot="chart"
        className={cn(
          "bg-card/55 relative flex min-h-[20rem] w-full items-center justify-center overflow-hidden rounded-xl border border-border/70 px-2 py-3 shadow-sm",
          className,
        )}
        style={style}
      >
        {chartChildren}
      </div>
    </ChartContext.Provider>
  );
}

export function ChartTooltipContent({
  active,
  payload,
  label,
  labelFormatter,
  formatter,
}: Partial<TooltipContentProps<ValueType, NameType>> & {
  labelFormatter?: (label: string | number) => React.ReactNode;
  formatter?: (value: ValueType, name: NameType) => React.ReactNode;
}) {
  const config = React.useContext(ChartContext);

  if (!active || !payload?.length) {
    return null;
  }

  const title = labelFormatter ? labelFormatter(label ?? "") : label;

  return (
    <div className="min-w-44 rounded-lg border border-border bg-popover/95 px-3 py-2 text-sm text-popover-foreground shadow-lg backdrop-blur-sm">
      {title ? <div className="mb-2 font-medium">{title}</div> : null}
      <div className="space-y-1.5">
        {payload.map(
          (
            entry: TooltipContentProps<ValueType, NameType>["payload"][number],
          ) => {
            const dataKey = String(entry.dataKey ?? entry.name ?? "");
            const series = config?.[dataKey];
            const markerColor =
              entry.color ?? series?.color ?? "var(--muted-foreground)";
            const content = formatter
              ? formatter(entry.value ?? "", entry.name ?? "")
              : `${series?.label ?? entry.name}: ${entry.value}`;

            return (
              <div
                key={dataKey}
                className="flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: markerColor }}
                  />
                  <span className="text-muted-foreground">
                    {series?.label ?? entry.name}
                  </span>
                </div>
                <span className="font-medium text-popover-foreground">
                  {content}
                </span>
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}

export const ChartTooltip = Recharts.Tooltip;
