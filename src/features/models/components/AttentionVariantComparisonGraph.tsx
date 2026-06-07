"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { useMemo, useState } from "react";
import type { z } from "zod";
import { MissingMessageKey } from "@/features/docs/components/MissingMessageKey";
import { usePageMessages } from "@/features/docs/components/page-messages-context";
import { RegistryGraphFlowCanvas } from "@/features/models/components/RegistryGraphFlow";
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

  const accessibleLabel = alt ?? "Attention variant head-count comparison";

  return (
    <figure
      className="attention-variant-comparison-figure"
      data-attention-variant-comparison="true"
      data-attention-variant-active={activeVariant.variantId}
      data-attention-variant-options={variants
        .map((variant) => variant.variantId)
        .join(",")}
    >
      <div
        className="attention-variant-comparison__controls mb-3 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Attention variant comparison"
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
      <ReactFlowProvider>
        <RegistryGraphFlowCanvas
          assetId={assetId}
          graphId={activeVariant.graphId}
          alt={accessibleLabel}
        />
      </ReactFlowProvider>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
