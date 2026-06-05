"use client";

import type { ReactNode } from "react";
import { usePageMessages } from "@/features/docs/components/page-messages-context";
import { lookupMessage } from "@/lib/content/messages";

export function Callout({
  type = "note",
  titleKey,
  children,
}: {
  type?: "note" | "warning";
  titleKey: string;
  children: ReactNode;
}) {
  const { messages, isDev } = usePageMessages();
  const titleResult = lookupMessage(messages, titleKey);

  return (
    <aside
      className="my-4 flex flex-col gap-2 rounded-md border border-border bg-muted/40 px-4 py-3.5"
      data-callout-type={type}
    >
      {titleResult.ok ? (
        <p className="text-sm font-medium text-foreground">
          {titleResult.value}
        </p>
      ) : isDev ? (
        <p className="text-sm text-destructive">
          Missing message key: {titleKey}
        </p>
      ) : null}
      <div className="text-sm text-muted-foreground">{children}</div>
    </aside>
  );
}
