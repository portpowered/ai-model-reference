"use client";

import { BlockMath } from "@/features/docs/components/Math";
import { MissingMessageKey } from "@/features/docs/components/MissingMessageKey";
import { usePageMessages } from "@/features/docs/components/page-messages-context";
import { lookupMessage } from "@/lib/content/messages";

type TBlockMathProps = {
  formulaKey: string;
  labelKey?: string;
};

export function TBlockMath({ formulaKey, labelKey }: TBlockMathProps) {
  const { messages, isDev } = usePageMessages();
  const formulaResult = lookupMessage(messages, formulaKey);

  if (!formulaResult.ok) {
    if (isDev) {
      return (
        <MissingMessageKey
          messageKey={formulaKey}
          reason={formulaResult.reason}
        />
      );
    }
    return null;
  }

  const labelResult = labelKey ? lookupMessage(messages, labelKey) : null;
  const label = labelResult?.ok ? labelResult.value : undefined;

  return (
    <figure className="not-prose my-0" data-message-block-math={formulaKey}>
      {label ? (
        <figcaption className="mb-2 text-sm font-medium text-muted-foreground">
          {label}
        </figcaption>
      ) : null}
      <BlockMath formula={formulaResult.value} />
    </figure>
  );
}
