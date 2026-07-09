"use client";

import type { ReactNode } from "react";

export type GraphLegendItem = {
  active?: boolean;
  color: string;
  label: string;
  onToggle?: () => void;
};

export function GraphFrame({
  axisLabelX,
  axisLabelY,
  body,
  chartLabel,
  chartTitleId,
  frameAxisLabels = true,
  legend,
  legendTestId,
}: {
  axisLabelX: string;
  axisLabelY: string;
  body: ReactNode;
  chartLabel: string;
  chartTitleId?: string;
  frameAxisLabels?: boolean;
  legend: readonly GraphLegendItem[];
  legendTestId?: string;
}) {
  return (
    <div>
      <div className="text-center">
        <div
          className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase"
          id={chartTitleId}
        >
          {chartLabel}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card/30">
        <div className="relative">
          {frameAxisLabels ? (
            <>
              <div className="pointer-events-none absolute inset-y-0 left-2 z-10 flex items-center">
                <span className="-rotate-90 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                  {axisLabelY}
                </span>
              </div>
              <div className="pointer-events-none absolute right-4 bottom-2 left-12 z-10 flex justify-center">
                <span className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                  {axisLabelX}
                </span>
              </div>
            </>
          ) : (
            <div className="sr-only">
              <span>{axisLabelY}</span>
              <span>{axisLabelX}</span>
            </div>
          )}

          {body}
        </div>

        <ul
          aria-label="Chart legend"
          className="flex flex-wrap items-center justify-center gap-6 bg-card/45 px-4 py-3"
          data-graph-legend={legendTestId ?? chartLabel}
        >
          {legend.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-2 text-sm text-foreground"
            >
              {item.onToggle ? (
                <button
                  type="button"
                  aria-pressed={item.active ?? true}
                  className="inline-flex items-center gap-2 rounded-md px-1.5 py-1 text-sm text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-pressed:false:text-muted-foreground"
                  onClick={item.onToggle}
                >
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        item.active === false ? "transparent" : item.color,
                      border:
                        item.active === false
                          ? `1px solid ${item.color}`
                          : undefined,
                    }}
                  />
                  <span>{item.label}</span>
                </button>
              ) : (
                <>
                  <span
                    aria-hidden="true"
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
