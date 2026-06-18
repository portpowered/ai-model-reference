"use client";

import { MissingMessageKey } from "@/features/docs/components/MissingMessageKey";
import { usePageMessages } from "@/features/docs/components/page-messages-context";
import { lookupMessage } from "@/lib/content/messages";

type LocalizedLinkListItem = {
  href: string;
  labelKey: string;
};

export function LocalizedLinkList({
  items,
}: {
  items: LocalizedLinkListItem[];
}) {
  const { messages, isDev } = usePageMessages();

  return (
    <ul className="mt-3 list-disc pl-6">
      {items.map((item) => {
        const result = lookupMessage(messages, item.labelKey);

        return (
          <li key={`${item.href}:${item.labelKey}`}>
            <a href={item.href}>
              {result.ok ? (
                result.value
              ) : isDev ? (
                <MissingMessageKey
                  messageKey={item.labelKey}
                  reason={result.reason}
                />
              ) : null}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
