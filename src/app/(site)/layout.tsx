import type { ReactNode } from "react";

import { RouteLocaleEffect } from "@/components/i18n/RouteLocaleEffect";
import { CanonicalDocsLayout } from "@/components/layout/canonical-docs-layout";
import { AppProviders } from "@/components/providers/app-providers";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { defaultLocale } from "@/lib/i18n/locale-routing";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";

export default async function SiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const messages = await loadUiMessages();
  const metaByUrl = searchResultMetaMapToRecord(
    await loadSearchResultMetaMap(defaultLocale),
  );
  return (
    <AppProviders metaByUrl={metaByUrl} messages={messages}>
      <CanonicalDocsLayout messages={messages} locale={defaultLocale}>
        <RouteLocaleEffect locale={defaultLocale} />
        {children}
      </CanonicalDocsLayout>
    </AppProviders>
  );
}
