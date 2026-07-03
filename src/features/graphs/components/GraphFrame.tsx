"use client";

import type { ReactNode } from "react";

export type GraphLegendItem = {
  color: string;
  label: string;
};

export function GraphFrame({
  axisLabelX,
  axisLabelY,
  body,
  chartLabel,
  chartTitleId,
  legend,
  legendTestId,
}: {
  axisLabelX: string;
  axisLabelY: string;
  body: ReactNode;
  chartLabel: string;
  chartTitleId?: string;
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
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
