"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { PageMessages } from "@/lib/content/schemas";
import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";

export type PageMessagesContextValue = {
  messages: PageMessages;
  locale: SiteLocale;
  isDev: boolean;
};

const PageMessagesContext = createContext<PageMessagesContextValue | null>(
  null,
);

export function PageMessagesProvider({
  messages,
  locale = defaultLocale,
  isDev = process.env.NODE_ENV === "development",
  children,
}: {
  messages: PageMessages;
  locale?: SiteLocale;
  isDev?: boolean;
  children: ReactNode;
}) {
  return (
    <PageMessagesContext.Provider value={{ messages, locale, isDev }}>
      {children}
    </PageMessagesContext.Provider>
  );
}

export function usePageMessages(): PageMessagesContextValue {
  const context = useContext(PageMessagesContext);
  if (!context) {
    throw new Error("usePageMessages must be used within PageMessagesProvider");
  }
  return context;
}

export function useOptionalPageMessages(): PageMessages | undefined {
  return useContext(PageMessagesContext)?.messages;
}

export function useOptionalPageMessagesContext():
  | PageMessagesContextValue
  | undefined {
  return useContext(PageMessagesContext) ?? undefined;
}
