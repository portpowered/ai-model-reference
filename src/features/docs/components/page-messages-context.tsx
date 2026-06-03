"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { PageMessages } from "@/lib/content/schemas";

export type PageMessagesContextValue = {
  messages: PageMessages;
  locale: string;
  isDev: boolean;
};

const PageMessagesContext = createContext<PageMessagesContextValue | null>(
  null,
);

export function PageMessagesProvider({
  messages,
  locale = "en",
  isDev = process.env.NODE_ENV === "development",
  children,
}: {
  messages: PageMessages;
  locale?: string;
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
