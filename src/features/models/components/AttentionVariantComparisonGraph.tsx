"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { useMemo, useState } from "react";
import type { z } from "zod";
import { MissingMessageKey } from "@/features/docs/components/MissingMessageKey";
import { usePageMessages } from "@/features/docs/components/page-messages-context";
import { RegistryGraphFlowCanvas } from "@/features/models/components/RegistryGraphFlow";
import { buildRegistryGraphLegend } from "@/features/models/components/registry-graph-legend";
import { lookupMessage } from "@/lib/content/messages";
import type {
  attentionVariantGraphVariantSchema,
  PageMessages,
} from "@/lib/content/schemas";

export type AttentionVariantGraphVariant = z.infer<
  typeof attentionVariantGraphVariantSchema
>;

function resolveVariantLabel(
  messages: PageMessages,
  labelKey: string,
  isDev: boolean,
): string | null {
  const result = lookupMessage(messages, labelKey);
  if (result.ok) {
    return result.value;
  }
  return isDev ? null : labelKey;
}

export function AttentionVariantComparisonGraph({
  assetId,
  variants,
  defaultVariantId,
  alt,
  caption,
  isDev = false,
}: {
  assetId: string;
  variants: AttentionVariantGraphVariant[];
  defaultVariantId: string;
  alt?: string;
  caption?: string;
  isDev?: boolean;
}) {
  const { messages } = usePageMessages();
  const [activeVariantId, setActiveVariantId] = useState(defaultVariantId);

  const activeVariant = useMemo(
    () =>
      variants.find((variant) => variant.variantId === activeVariantId) ??
      variants[0],
    [activeVariantId, variants],
  );

  if (!activeVariant) {
    return null;
  }

  const variantLabels = variants.map((variant) => {
    const label = resolveVariantLabel(messages, variant.labelKey, isDev);
    return { variant, label };
  });

  const missingLabel = variantLabels.find((entry) => entry.label === null);
  if (missingLabel && isDev) {
    return (
      <MissingMessageKey
        messageKey={missingLabel.variant.labelKey}
        reason="missing"
      />
    );
  }

  const accessibleLabel = alt ?? "Variant comparison graph";
  const assetMessages = messages.assets?.[assetId];
  const title = assetMessages?.title;
  const legend = buildRegistryGraphLegend(
    activeVariant.graphId,
    assetMessages?.legend,
  );

  return (
    <figure
      className="attention-variant-comparison-figure flex flex-col"
      data-attention-variant-comparison="true"
      data-attention-variant-active={activeVariant.variantId}
      data-attention-variant-options={variants
        .map((variant) => variant.variantId)
        .join(",")}
    >
      {title ? (
        <div
          className="order-0 mb-3 text-center text-sm font-semibold tracking-[0.16em] text-muted-foreground uppercase"
          data-graph-title={activeVariant.graphId}
        >
          {title}
        </div>
      ) : null}
      <div
        className="attention-variant-comparison__controls order-2 mt-3 flex flex-wrap gap-2 md:order-1 md:mb-3 md:mt-0"
        role="tablist"
        aria-label="Variant comparison"
      >
        {variantLabels.map(({ variant, label }) => (
          <button
            key={variant.variantId}
            type="button"
            role="tab"
            aria-selected={activeVariant.variantId === variant.variantId}
            data-attention-variant-option={variant.variantId}
            className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              activeVariant.variantId === variant.variantId
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-muted"
            }`}
            onClick={() => setActiveVariantId(variant.variantId)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="order-1 md:order-2">
        <ReactFlowProvider>
          <RegistryGraphFlowCanvas
            assetId={assetId}
            graphId={activeVariant.graphId}
            alt={accessibleLabel}
          />
        </ReactFlowProvider>
      </div>
      {legend.length > 0 ? (
        <div
          className="order-3 mt-3 flex flex-wrap items-center justify-center gap-4 rounded-xl border border-border/60 bg-card/35 px-4 py-3 text-sm"
          data-graph-legend={activeVariant.graphId}
        >
          {legend.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      ) : null}
      {caption ? <figcaption className="order-4">{caption}</figcaption> : null}
    </figure>
  );
}
