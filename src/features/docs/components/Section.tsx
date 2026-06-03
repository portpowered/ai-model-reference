"use client";

import type { ReactNode } from "react";
import { MissingMessageKey } from "@/features/docs/components/MissingMessageKey";
import { usePageMessages } from "@/features/docs/components/page-messages-context";
import { lookupMessage } from "@/lib/content/messages";

export function Section({
  id,
  titleKey,
  children,
}: {
  id: string;
  titleKey: string;
  children: ReactNode;
}) {
  const { messages, isDev } = usePageMessages();
  const titleResult = lookupMessage(messages, titleKey);

  return (
    <section id={id}>
      <h2>
        {titleResult.ok ? (
          titleResult.value
        ) : isDev ? (
          <MissingMessageKey
            messageKey={titleKey}
            reason={titleResult.reason}
          />
        ) : null}
      </h2>
      {children}
    </section>
  );
}
