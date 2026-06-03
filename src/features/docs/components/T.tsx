"use client";

import { MissingMessageKey } from "@/features/docs/components/MissingMessageKey";
import { usePageMessages } from "@/features/docs/components/page-messages-context";
import { lookupMessage } from "@/lib/content/messages";

export function T({ k }: { k: string }) {
  const { messages, isDev } = usePageMessages();
  const result = lookupMessage(messages, k);

  if (result.ok) {
    return <>{result.value}</>;
  }

  if (isDev) {
    return <MissingMessageKey messageKey={k} reason={result.reason} />;
  }

  return null;
}
