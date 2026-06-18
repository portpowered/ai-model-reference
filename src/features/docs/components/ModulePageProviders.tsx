"use client";

import type { ReactNode } from "react";
import { PageAssetsProvider } from "@/features/docs/components/page-assets-context";
import { PageMessagesProvider } from "@/features/docs/components/page-messages-context";
import type { PageAssetConfig, PageMessages } from "@/lib/content/schemas";
import type { SiteLocale } from "@/lib/i18n/locale-routing";

export function ModulePageProviders({
  messages,
  assets,
  locale,
  children,
}: {
  messages: PageMessages;
  assets: PageAssetConfig;
  locale?: SiteLocale;
  children?: ReactNode;
}) {
  return (
    <PageMessagesProvider messages={messages} locale={locale}>
      <PageAssetsProvider assets={assets}>{children}</PageAssetsProvider>
    </PageMessagesProvider>
  );
}
