"use client";

import type { ReactNode } from "react";
import { PageAssetsProvider } from "@/features/docs/components/page-assets-context";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import type { PageAssetConfig, PageMessages } from "@/lib/content/schemas";

export function ModulePageProviders({
  messages,
  assets,
  children,
}: {
  messages: PageMessages;
  assets: PageAssetConfig;
  children: ReactNode;
}) {
  return (
    <PageMessagesProvider messages={messages}>
      <PageAssetsProvider assets={assets}>{children}</PageAssetsProvider>
    </PageMessagesProvider>
  );
}
